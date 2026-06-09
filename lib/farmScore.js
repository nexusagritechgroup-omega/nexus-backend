// api/farmScore.js — Production Grade
// Vercel Cron setiap malam jam 01:00 WIB
// Hitung ulang Farm Score semua user aktif dalam 30 hari terakhir

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue }      from 'firebase-admin/firestore';

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })});
  }
  return getFirestore();
}

const WEIGHTS = { health:0.40, productivity:0.20, consistency:0.15, verification:0.10, financial:0.10, community:0.05 };

export default async function handler(req, res) {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET)
    return res.status(403).json({ error:'Unauthorized' });

  const start = Date.now();
  const db    = getAdminDb();
  try {
    const thirtyAgo = Date.now() - 30*86_400_000;
    const logsSnap  = await db.collection('dailyLogs').where('timestamp','>=',thirtyAgo).get();
    const userIds   = [...new Set(logsSnap.docs.map(d => d.data().userId))];
    console.log(`[farmScore] Recalculating ${userIds.length} users`);

    let processed=0, errors=0;
    for (let i=0; i<userIds.length; i+=10) {
      await Promise.allSettled(
        userIds.slice(i,i+10).map(async uid => {
          try { await recalculate(uid, db); processed++; }
          catch(e) { console.error(`[farmScore] ${uid}:`, e.message); errors++; }
        })
      );
    }
    const duration = Date.now()-start;
    await db.collection('auditLog').add({ actorId:'system', action:'FARM_SCORE_BATCH', collection:'users', documentId:'batch', after:{processed,errors,duration}, source:'system', timestamp:Date.now(), _immutable:true });
    return res.status(200).json({ success:true, processed, errors, duration });
  } catch(err) {
    return res.status(500).json({ success:false, error:err.message });
  }
}

async function recalculate(userId, db) {
  const thirtyAgo = Date.now() - 30*86_400_000;
  const [logs, checks, animals, txs] = await Promise.all([
    db.collection('dailyLogs').where('userId','==',userId).where('timestamp','>=',thirtyAgo).orderBy('timestamp','desc').limit(90).get().then(s=>s.docs.map(d=>d.data())),
    db.collection('healthChecks').where('userId','==',userId).orderBy('timestamp','desc').limit(30).get().then(s=>s.docs.map(d=>d.data())),
    db.collection('animals').where('ownerId','==',userId).get().then(s=>s.docs.map(d=>d.data())),
    db.collection('transactions').where('fromUserId','==',userId).limit(50).get().then(s=>s.docs.map(d=>d.data())),
  ]);
  const active = animals.filter(a=>a.status==='active');
  const dims = {
    health:       calcHealth(checks, animals),
    productivity: calcProductivity(logs, active),
    consistency:  calcConsistency(logs, active),
    verification: calcVerification(logs),
    financial:    calcFinancial(txs),
    community:    0,
  };
  const total = Math.round(Object.entries(dims).reduce((s,[k,v])=>s+v*WEIGHTS[k],0)*10)/10;
  await db.collection('users').doc(userId).update({
    'scores.farmScore': total, 'scores.dimensions': dims,
    'scores.lastCalculated': FieldValue.serverTimestamp(),
    'scores.dataPointsUsed': logs.length+checks.length,
    '_updatedAt': FieldValue.serverTimestamp(),
  });
  return { userId, total };
}

function calcHealth(checks, animals) {
  if (!checks.length) return 50;
  const lvl = { normal:100, waspada:75, siaga:50, darurat:20, kritis:0 };
  const avg = checks.reduce((s,c)=>s+(lvl[c.alertLevel]??50),0)/checks.length;
  const ago = Date.now()-30*86_400_000;
  const dead = animals.filter(a=>a.status==='dead'&&(a.deathDate?.toMillis?.()|| a.deathDate||0)>ago).length;
  return Math.max(0,Math.min(100,Math.round(avg-dead*15)));
}

function calcProductivity(logs, active) {
  if (logs.length<5||!active.length) return 50;
  const bench = { goat:0.08, cow:0.6, sheep:0.07, chicken_broiler:0.06, duck:0.04, pig:0.5 };
  const byAnimal = {};
  logs.forEach(l=>{ if(l.weight&&l.animalId){ if(!byAnimal[l.animalId]) byAnimal[l.animalId]=[]; byAnimal[l.animalId].push(l); }});
  const scores=[];
  for(const [id,wl] of Object.entries(byAnimal)) {
    if(wl.length<2) continue;
    const s=wl.sort((a,b)=>a.timestamp-b.timestamp);
    const days=(s[s.length-1].timestamp-s[0].timestamp)/86_400_000;
    if(days<=0) continue;
    const adg=(s[s.length-1].weight-s[0].weight)/days;
    const animal=active.find(a=>a.id===id)||active[0];
    const b=bench[animal?.species]||0.08;
    scores.push(Math.min(100,Math.max(0,adg/b)*80));
  }
  return scores.length?Math.round(scores.reduce((s,v)=>s+v,0)/scores.length):50;
}

function calcConsistency(logs, active) {
  if(!active.length) return 0;
  const days=new Set(logs.map(l=>new Date(l.timestamp).toDateString())).size;
  return Math.min(100,Math.round((days/30)*100)+(logs.length>45?5:0));
}

function calcVerification(logs) {
  if(!logs.length) return 50;
  const v=logs.filter(l=>l._verified||l.source==='sensor').length;
  return Math.round((v/logs.length)*100);
}

function calcFinancial(txs) {
  if(!txs.length) return 50;
  const ok=txs.filter(t=>t.status==='completed').length;
  const bad=txs.filter(t=>t.status==='disputed').length;
  return Math.max(0,Math.min(100,50+ok*4-bad*10));
}

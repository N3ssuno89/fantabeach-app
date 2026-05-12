// AthleteProfile — profilo completo atleta con grafico prezzi
import React from 'react';
import { B } from '@/config/colors';
import { getCategory } from '@/utils/scoring';

function AthleteProfile({a,onBack,isOwned,onBuy,onSell,budget,canTrade}) {
  const cat=getCategory(a.ranking);
  const diff=a.cost-a.prevCost;
  const maxH=Math.max(...a.costHistory);
  const W=240,H=64;
  const photo=ATHLETE_PHOTOS[a.id];
  return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Indietro</button>
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:14,padding:"18px 16px",marginBottom:12,textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 10px",overflow:"hidden",background:photo?"#000":cat.bg,border:`2px solid ${cat.text}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {photo?<img src={photo} alt={a.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}}/>:<LogoBall size={48}/>}
        </div>
        <div style={{color:B.dark,fontWeight:"bold",fontSize:19}}>{a.name}</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,margin:"8px 0 12px"}}>
          <span style={{fontSize:11,padding:"2px 10px",borderRadius:8,background:cat.bg,color:cat.text,fontWeight:"bold"}}>{cat.label}</span>
          <span style={{fontSize:11,padding:"2px 10px",borderRadius:8,background:B.grayPale,color:B.gray}}>{a.gender==="F"?"♀":"♂"}</span>
        </div>
        <div style={{display:"flex",justifyContent:"center"}}>
          {[{label:"Ranking",value:`#${a.ranking}`,color:B.orange},{label:"Costo",value:`$${a.cost}`,color:B.greenDark},{label:"Var.",value:diff===0?"—":diff>0?`+${diff}`:`${diff}`,color:diff>0?B.greenDark:diff<0?B.orange:B.gray}].map((s,i)=>(
            <div key={i} style={{flex:1,padding:"8px 4px",borderRight:i<2?`1px solid ${B.creamDark}`:"none"}}>
              <div style={{color:s.color,fontWeight:"bold",fontSize:20}}>{s.value}</div>
              <div style={{color:B.gray,fontSize:10}}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:14}}>
          {isOwned?(<button onClick={onSell} style={{padding:"10px 24px",borderRadius:10,border:`1px solid ${canTrade?B.orange:B.grayLight}`,background:canTrade?B.orangePale:B.grayPale,color:canTrade?B.orange:B.gray,fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>{canTrade?`Vendi ($${a.cost})`:"Vendita bloccata"}</button>)
          :(<button onClick={onBuy} style={{padding:"10px 24px",borderRadius:10,border:"none",background:budget>=a.cost&&canTrade?B.greenDark:B.grayPale,color:budget>=a.cost&&canTrade?B.white:B.gray,fontWeight:"bold",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"}}>{!canTrade?"Mercato chiuso":budget>=a.cost?`Acquista ($${a.cost})`:"Crediti insufficienti"}</button>)}
        </div>
      </div>
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"13px",marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Andamento Prezzo</div>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <polyline points={a.costHistory.map((v,i)=>`${(i/(a.costHistory.length-1))*(W-20)+10},${H-10-((v/maxH)*(H-20))}`).join(" ")} fill="none" stroke={B.greenDark} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          {a.costHistory.map((v,i)=>(<circle key={i} cx={(i/(a.costHistory.length-1))*(W-20)+10} cy={H-10-((v/maxH)*(H-20))} r="4" fill={B.orange}/>))}
        </svg>
        <div style={{display:"flex",justifyContent:"space-between"}}>{["T-4","T-3","T-2","T-1","Ora"].map(l=>(<span key={l} style={{color:B.grayLight,fontSize:9}}>{l}</span>))}</div>
      </div>
      <div style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:12,padding:"13px"}}>
        <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:10}}>Ultimi Risultati</div>
        {a.results.map((r,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<a.results.length-1?`1px solid ${B.creamDark}`:"none"}}><div><div style={{color:B.dark,fontSize:13,fontWeight:"bold"}}>{r.event}</div><div style={{color:B.gray,fontSize:11}}>{r.phase}</div></div><div style={{color:B.orange,fontWeight:"bold",fontSize:16}}>+{r.pts} pt</div></div>))}
      </div>
    </div>
  );
}

export { AthleteProfile };

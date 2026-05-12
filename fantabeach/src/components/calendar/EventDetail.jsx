// EventDetail — dettaglio partite di una tappa
import React from 'react';
import { B } from '@/config/colors';
import { MOCK_MATCHES } from '@/data/mockEvents';

function EventDetail({event,onBack}) {
  const matches=MOCK_MATCHES[event.id]||[];
  const phases=[...new Set(matches.map(m=>m.phase))];
  return (
    <div>
      <button onClick={onBack} style={{background:B.grayPale,border:"none",color:B.gray,padding:"7px 14px",borderRadius:20,cursor:"pointer",marginBottom:14,fontSize:12,fontFamily:"Georgia,serif"}}>← Tornei</button>
      <div style={{background:B.greenDark,borderRadius:12,padding:"14px 16px",marginBottom:14,color:B.white}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontWeight:"bold",fontSize:18}}>{event.name}</div><div style={{color:"rgba(255,255,255,.6)",fontSize:12,marginTop:2}}>{event.date}</div></div>
          <div style={{background:event.type==="Gold"?B.yellow:B.greenPale,color:event.type==="Gold"?"#7A4F00":B.greenDark,padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:"bold"}}>{event.type} ×{event.weight}</div>
        </div>
      </div>
      {matches.length===0?(<div style={{textAlign:"center",padding:"40px 20px",color:B.gray}}><div style={{fontSize:40,marginBottom:10}}>📋</div><div>Risultati non ancora disponibili</div></div>):(
        phases.map(phase=>(
          <div key={phase} style={{marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:"bold",letterSpacing:2,textTransform:"uppercase",color:B.greenDark,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,height:1,background:B.creamDark}}/>{phase}<div style={{flex:1,height:1,background:B.creamDark}}/>
            </div>
            {matches.filter(m=>m.phase===phase).map((m,i)=>(
              <div key={i} style={{background:B.white,border:`1px solid ${B.creamDark}`,borderRadius:10,padding:"11px 13px",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{flex:1,fontSize:12,fontWeight:"bold",color:B.dark,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.teamA}</div>
                  <div style={{flexShrink:0,background:B.greenDark,color:B.white,padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:"bold"}}>{m.result}</div>
                  <div style={{flex:1,fontSize:12,color:B.gray,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.teamB||"BYE"}</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:`1px solid ${B.creamDark}`,fontSize:11}}>
                  <div><div style={{color:B.gray,fontSize:10}}>Set</div><div style={{color:B.dark,fontWeight:"bold"}}>{m.scoreA}</div></div>
                  <div style={{textAlign:"center"}}><div style={{color:B.gray,fontSize:10}}>Punti fantasy</div><div style={{display:"flex",gap:16,marginTop:2}}><span style={{color:m.ptsA>m.ptsB?B.orange:B.gray,fontWeight:"bold",fontSize:14}}>+{m.ptsA}</span><span style={{color:m.ptsB>m.ptsA?B.orange:B.gray,fontWeight:"bold",fontSize:14}}>{m.teamB?"+":""}{m.teamB?m.ptsB:"—"}</span></div></div>
                  <div style={{textAlign:"right"}}><div style={{color:B.gray,fontSize:10}}>Peso</div><div style={{color:B.greenDark,fontWeight:"bold"}}>×{event.weight}</div></div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export { EventDetail };

// BonusItem — accordion per regole bonus/malus
import React, { useState } from 'react';
import { B } from '@/config/colors';

function BonusItem({b}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:"#FFFFFF",border:"1px solid #EDE7DC",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
      <button onClick={()=>setOpen(!open)}
        style={{width:"100%",padding:"11px 14px",border:"none",background:"transparent",
          cursor:"pointer",fontFamily:"Georgia,serif",display:"flex",alignItems:"center",
          gap:10,textAlign:"left"}}>
        <span style={{fontSize:20}}>{b.icon==="star"?"⭐":b.icon==="hat"?"🧢":"🔥"}</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:"bold",fontSize:13,color:"#1A2E28"}}>{b.label}</div>
          <div style={{fontSize:11,color:"#6B7B74"}}>{b.sub}</div>
        </div>
        <span style={{color:"#6B7B74",fontSize:14}}>{open?"▲":"▼"}</span>
      </button>
      {open&&(
        <div style={{padding:"10px 14px 12px",fontSize:12,color:"#6B7B74",
          lineHeight:1.7,borderTop:"1px solid #EDE7DC"}}>
          {b.detail}
        </div>
      )}
    </div>
  );
}

export { BonusItem };

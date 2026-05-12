// Logo components — FantaBeach
import React from 'react';
import { B } from '@/config/colors';

const LogoBall = ({size=32}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="48" fill={B.yellow}/>
    <path d="M50 2 Q80 20 90 50 Q70 35 50 38 Q30 35 10 50 Q20 20 50 2Z" fill={B.orange}/>
    <path d="M10 50 Q30 65 50 62 Q70 65 90 50 Q80 80 50 98 Q20 80 10 50Z" fill={B.greenDark}/>
    <path d="M50 38 Q70 35 90 50 Q70 65 50 62 Q30 65 10 50 Q30 35 50 38Z" fill={B.red} opacity="0.6"/>
  </svg>
);
const LogoFull = () => (
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    <LogoBall size={38}/>
    <div style={{lineHeight:1.1}}>
      <span style={{fontFamily:"Georgia,serif",fontWeight:"bold",fontSize:22,color:B.dark}}>Fanta</span>
      <span style={{fontFamily:"Georgia,serif",fontWeight:"bold",fontSize:22,color:B.green}}>Beach</span>
    </div>
  </div>
);

// Athlete photo avatar

const LogoFull = () => (
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    <LogoBall size={38}/>
    <div style={{lineHeight:1.1}}>
      <span style={{fontFamily:"Georgia,serif",fontWeight:"bold",fontSize:22,color:B.dark}}>Fanta</span>
      <span style={{fontFamily:"Georgia,serif",fontWeight:"bold",fontSize:22,color:B.green}}>Beach</span>
    </div>
  </div>
);

export { LogoBall, LogoFull };

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
const AthleteAvatar = ({athlete, size=70, isStarter, isCaptain}) => {
  const photo = ATHLETE_PHOTOS[athlete.id];
  const cat = getCategory(athlete.ranking);
  const borderColor = isCaptain ? B.yellow : isStarter ? B.green : B.grayLight;
  const borderStyle = isStarter ? "2px solid" : "2px dashed";
  return (
    <div style={{width:size, height:size, borderRadius:"50%", overflow:"hidden", flexShrink:0,
      border:`${borderStyle} ${borderColor}`, position:"relative",
      background: photo ? "#000" : isStarter ? (isCaptain ? B.yellow : B.green) : B.grayPale,
      display:"flex", alignItems:"center", justifyContent:"center"}}>
      {photo ? (
        <img src={photo} alt={athlete.name} style={{width:"100%", height:"100%", objectFit:"cover", objectPosition:"top"}}/>
      ) : (
        <span style={{fontSize:size*0.13, color:isStarter?B.white:B.gray, fontWeight:"bold",
          textAlign:"center", padding:"0 4px", lineHeight:1.2}}>
          {athlete.name.split(" ")[0].substring(0,7)}
        </span>
      )}
      {isCaptain && (
        <div style={{position:"absolute", top:-4, right:-4, width:20, height:20,
          background:B.orange, borderRadius:"50%", display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:11, color:B.white, fontWeight:"bold"}}>★</div>
      )}
    </div>
  );
};

export { LogoBall, LogoFull };

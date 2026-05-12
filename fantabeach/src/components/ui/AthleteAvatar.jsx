// AthleteAvatar component
import React from 'react';
import { B } from '@/config/colors';
import { ATHLETE_PHOTOS } from '@/data/mockAthletes';

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

export { AthleteAvatar };

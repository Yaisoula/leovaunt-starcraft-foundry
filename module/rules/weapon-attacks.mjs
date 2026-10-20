import {woundPenalties} from "./wounds.mjs";
// Standard attack preview, Leovaunt Core Rulebook pp. 55, 100, 156.
// Full-auto modes and damage from attack averages intentionally deferred.
const n=value=>Number(value)||0;
export function weaponAttack(actorSystem,weapon,woundPoints={}){
 const wp=woundPenalties(woundPoints);
 const w=weapon.system,rate=String(w.rateOfFire||"Average").toLowerCase();
 const score=k=>{const v=actorSystem.attributes[k];return typeof v==="number"?n(v):n(v?.base)+n(v?.misc);};
 const agility=score("agility");
 const melee=String(w.range).toLowerCase()==="melee" || /melee|sword|knife|tool|unarmed|psiblade/i.test(w.weaponClass||"");
 const skill=melee?"melee":"ranged";
 const fullAuto=["full automatic","full auto","full automatic fire"].includes(rate);
 const automatic=rate==="automatic"||rate==="automatic fire";
 const supported=["slow","average","fast"].includes(rate)||automatic||fullAuto;
 const strikes=rate==="slow"?1:rate==="average"?1+Math.floor(Math.max(0,agility)/4):(["fast"].includes(rate)||automatic)?2+Math.floor(Math.max(0,agility)/3):fullAuto?1:0;
 const shots=n(w.shots),ammo=n(w.currentShots),requiresAmmo=shots>0;
 const used=requiresAmmo?strikes:0;
 const tier=Math.max(1,Math.trunc(n(w.tier)||1));
 const strength=score("strength");
 const instinct=score("instinct");
 const damage=n(w.damage)+Math.max(0,tier-1)*n(w.powerRating)+(melee?Math.floor(strength/2):0);
 const accuracy=n(actorSystem.prowess[skill]?.ranks??actorSystem.prowess[skill])+n(w.accuracy)+Math.max(0,tier-1)+Math.max(0,strikes-1)*4-wp.attack;
 return {skill,melee,rate,automatic,fullAuto,supported,strikes,accuracy,damage,overageCap:Math.max(0,melee?strength:instinct),tier,requiresAmmo,ammo,capacity:shots,ammoNeeded:used,canFire:supported&&strikes>0&&(!requiresAmmo||ammo>=used)};
}

/** Attack overage: hit at >= Defense, bonus limited by Strength (melee) or Instinct (ranged).
 * This computes pre-resistance damage only. Penetration, rending, talents and
 * target-specific resistances are deliberately not applied here. */
export function resolveWeaponDamage(attack,total,defense){
 const dc=Number(defense);
 if(!Number.isFinite(dc)||dc<0)throw new Error("A valid target Defense is required.");
 const hit=total>=dc;
 const overage=hit?Math.min(Math.max(0,total-dc),attack.overageCap):0;
 return {hit,overage,damage:hit?attack.damage+overage:0,defense:dc};
}

/** Leovaunt Core pp. 156–163. One attack roll per selected firing method. */
export function firingModes(attack){
 const normal={id:"normal",label:"Normal Attack",ammo:attack.requiresAmmo?attack.strikes:0,strikes:attack.strikes,accuracy:attack.accuracy,hailfire:0,burst:0,cone:0,advantage:false};
 if(attack.melee||(!attack.automatic&&!attack.fullAuto))return [normal];
 const base=attack.accuracy-Math.max(0,attack.strikes-1)*4;
 const special=(id,label,ammo,extra={})=>({id,label,ammo,strikes:1,accuracy:base,hailfire:0,burst:0,cone:0,advantage:false,...extra});
 const modes=[];
 if(attack.automatic)modes.push(normal);
 modes.push(special("area1","Area Burst (1)",10,{hailfire:1,burst:1}));
 if(attack.fullAuto)modes.push(special("area2","Area Burst (2)",20,{hailfire:1,burst:2}));
 modes.push(special("focused","Focused Burst",10,{hailfire:2}));
 if(attack.fullAuto){modes.push(special("empowered","Empowered Focused Burst",20,{hailfire:2,advantage:true}));modes.push(special("saturation","Saturation Fire",10,{accuracy:base+10}));}
 modes.push(special("suppress","Suppressing Fire",40,{cone:12,suppress:true}));
 if(attack.fullAuto)modes.push(special("suppressFull","Full-Auto Suppressing Fire",80,{cone:18,suppress:true,advantage:true}));
 return modes;
}
export function selectedFiringMode(attack,id="normal"){
 const mode=firingModes(attack).find(m=>m.id===id);
 if(!mode)throw Error("This firing mode is not available for this weapon.");
 return {...mode,canFire:attack.supported&&(!attack.requiresAmmo||attack.ammo>=mode.ammo)};
}

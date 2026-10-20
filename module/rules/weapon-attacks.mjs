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
 const supported=["slow","average","fast","automatic"].includes(rate);
 const strikes=rate==="slow"?1:rate==="average"?1+Math.floor(Math.max(0,agility)/4):["fast","automatic"].includes(rate)?2+Math.floor(Math.max(0,agility)/3):0;
 const shots=n(w.shots),ammo=n(w.currentShots),requiresAmmo=shots>0;
 const used=requiresAmmo?strikes:0;
 const tier=Math.max(1,Math.trunc(n(w.tier)||1));
 const strength=score("strength");
 const instinct=score("instinct");
 const damage=n(w.damage)+Math.max(0,tier-1)*n(w.powerRating)+(melee?Math.floor(strength/2):0);
 const accuracy=n(actorSystem.prowess[skill]?.ranks??actorSystem.prowess[skill])+n(w.accuracy)+Math.max(0,tier-1)+Math.max(0,strikes-1)*4-wp.attack;
 return {skill,melee,rate,supported,strikes,accuracy,damage,overageCap:Math.max(0,melee?strength:instinct),tier,requiresAmmo,ammo,capacity:shots,ammoNeeded:used,canFire:supported&&strikes>0&&(!requiresAmmo||ammo>=used)};
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

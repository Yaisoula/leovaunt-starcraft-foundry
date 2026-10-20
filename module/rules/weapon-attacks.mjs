// Standard attack preview, Leovaunt Core Rulebook pp. 55, 100, 156.
// Full-auto modes and damage from attack averages intentionally deferred.
const n=value=>Number(value)||0;
export function weaponAttack(actorSystem,weapon){
 const w=weapon.system,rate=String(w.rateOfFire||"Average").toLowerCase();
 const agility=n(actorSystem.attributes.agility.base)+n(actorSystem.attributes.agility.misc);
 const melee=String(w.range).toLowerCase()==="melee" || /melee|sword|knife|tool|unarmed|psiblade/i.test(w.weaponClass||"");
 const skill=melee?"melee":"ranged";
 const supported=["slow","average","fast","automatic"].includes(rate);
 const strikes=rate==="slow"?1:rate==="average"?1+Math.floor(Math.max(0,agility)/4):["fast","automatic"].includes(rate)?2+Math.floor(Math.max(0,agility)/3):0;
 const shots=n(w.shots),ammo=n(w.currentShots),requiresAmmo=shots>0;
 const used=requiresAmmo?strikes:0;
 const accuracy=n(actorSystem.prowess[skill].ranks)+n(w.accuracy)+Math.max(0,strikes-1)*4;
 return {skill,melee,rate,supported,strikes,accuracy,damage:n(w.damage),requiresAmmo,ammo,capacity:shots,ammoNeeded:used,canFire:supported&&strikes>0&&(!requiresAmmo||ammo>=used)};
}

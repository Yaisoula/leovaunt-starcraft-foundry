// Shared physical damage resolution, Leovaunt Core Rulebook pp. 159, 173-175.
// Pure functions: no Foundry globals. Special Hailfire, EMP, acid, burst, immunity,
// critical and wound-location effects require separate rules and are not silently assumed.
const whole=(v,def=0)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.trunc(n)):def;};
export function parsePhysicalTraits(text=""){
 const source=String(text);
 const capture=name=>{const match=source.match(new RegExp("(?:^|[,;\\s])"+name+"\\s*\\(\\s*(\\d+)\\s*\\)","i"));return match?whole(match[1]):0;};
 return {penetration:capture("Penetration"),rending:capture("Rending"),hasUnsupportedEffects:/(?:hailfire|burst|energy damage|acid damage|emp|piercing|high explosive)/i.test(source)};
}
export function resolvePhysicalDamage({damage=0,penetration=0,rending=0,shield=0,shieldArmor=0,resistance=0,protection=0,hp=0,threshold=0}={}){
 const raw=whole(damage),shields=whole(shield),armor=whole(shieldArmor),dr=whole(resistance),pen=whole(penetration),rend=whole(rending),pp=whole(protection),health=whole(hp);
 // Shield Armor is applied to incoming shield damage, but not to shield spillover.
 const shieldIncoming=shields>0?Math.max(0,raw-armor):0;
 const shieldAbsorbed=Math.min(shields,shieldIncoming);
 const spill=shields>0?Math.max(0,shieldIncoming-shieldAbsorbed):raw;
 const effectiveResistance=Math.max(0,dr-pen);
 const afterResistance=Math.max(0,spill-effectiveResistance);
 const protectionAbsorbed=Math.min(pp,afterResistance);
 const hpLost=Math.min(health,Math.max(0,afterResistance-protectionAbsorbed));
 const adjustedThreshold=Math.max(1,whole(threshold,1)-rend);
 // Crippling wound count is assessed after DR, before protection, on the single hit.
 // Shield-only damage never reaches the body and does not cause body wounds.
 const wounds=afterResistance>0?Math.floor(afterResistance/adjustedThreshold):0;
 return {raw,shieldAbsorbed,shieldRemaining:shields-shieldAbsorbed,spill,effectiveResistance,postResistance:afterResistance,
 protectionAbsorbed,protectionRemaining:pp-protectionAbsorbed,hpLost,hpRemaining:health-hpLost,adjustedThreshold,wounds};
}

/** Rulebook pp. 159, 173–176: Hailfire is multiplied after DR, but energy
 * shields take repeated identical hits. When shields break, one unmultiplied
 * hit can pass to the body. Protection absorbs post-resistance damage.
 * Wounds are tested against damage before protection, and Hailfire adds
 * extra wounds when the original hit crosses the threshold. */
export function resolveAttackDamage({damage=0,penetration=0,rending=0,hailfire=0,shield=0,shieldArmor=0,resistance=0,protection=0,hp=0,threshold=1}={}){
 const raw=whole(damage),hf=Math.min(20,whole(hailfire)),multiplier=hf+1;
 const shields=whole(shield),armor=whole(shieldArmor),dr=whole(resistance),pen=whole(penetration),pp=whole(protection),health=whole(hp);
 const perShieldHit=Math.max(0,raw-armor);
 const shieldAbsorbed=Math.min(shields,perShieldHit*multiplier);
 const shieldRemaining=shields-shieldAbsorbed;
 let spill=raw;
 let bodyMultiplier=multiplier;
 if(shields>0&&perShieldHit>0){
  if(shieldRemaining>0 || perShieldHit*multiplier<=shields){spill=0;bodyMultiplier=0;}
  else {
   // After the shield is exhausted, only one identical hit reaches the body.
   spill=raw;
   bodyMultiplier=1;
  }
 }
 const effectiveResistance=Math.max(0,dr-pen);
 const perHitAfterResistance=Math.max(0,spill-effectiveResistance);
 const postResistance=perHitAfterResistance*bodyMultiplier;
 const protectionAbsorbed=Math.min(pp,postResistance);
 const hpLost=Math.min(health,Math.max(0,postResistance-protectionAbsorbed));
 const adjustedThreshold=Math.max(1,whole(threshold,1)-whole(rending));
 const baseWounds=perHitAfterResistance>0?Math.floor(perHitAfterResistance/adjustedThreshold):0;
 const wounds=baseWounds>0?baseWounds*(bodyMultiplier===multiplier?multiplier:1):0;
 return {raw,hailfire:hf,multiplier,shieldAbsorbed,shieldRemaining,spill,effectiveResistance,perHitAfterResistance,postResistance,protectionAbsorbed,protectionRemaining:pp-protectionAbsorbed,hpLost,hpRemaining:health-hpLost,adjustedThreshold,wounds};
}

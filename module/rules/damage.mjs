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

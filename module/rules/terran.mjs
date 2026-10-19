// Leovaunt Core Rulebook (2024), printed p.55. Medium heroic Terran defaults.
export const ATTRIBUTE_LABELS={strength:"Strength",instinct:"Instinct",agility:"Agility",fortitude:"Fortitude",intelligence:"Intelligence",willpower:"Willpower"};
export const SKILL_ATTRIBUTES={acrobatics:"agility",athletics:"strength",computers:"intelligence",endurance:"fortitude",influence:"willpower",leadership:"willpower",lore:"intelligence",medicine:"intelligence",perception:"instinct",pilot:"instinct",psionics:"willpower",science:"intelligence",stealth:"agility",survival:"fortitude",tactics:"intelligence"};
export const PROWESS_LABELS={defensiveTraining:"Defensive Training",durability:"Durability",melee:"Melee",mentalTraining:"Mental Training",ranged:"Ranged"};
export const label=k=>k.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase());
export function calculateTerran(s){
 const a=Object.fromEntries(Object.entries(s.attributes).map(([k,v])=>[k,Number(v.base)+Number(v.misc)]));
 const p=Object.fromEntries(Object.entries(s.prowess).map(([k,v])=>[k,Number(v.ranks)]));
 const c=s.combat,h=n=>Math.floor(n/2);
 const computed={
 hpMax:(s.heroic?40:20)+3*a.fortitude+p.durability*(5+a.fortitude)+c.bonusHP,
 healingThreshold:5+h(a.fortitude),
 defense:10+p.defensiveTraining+a.agility+c.armorDefensePenalty+c.sizeDefense+c.defenseMisc,
 toughness:10+p.defensiveTraining+a.strength+c.sizeToughness+c.toughnessMisc,
 resolve:10+p.mentalTraining+a.willpower+c.resolveMisc,
 damageThreshold:16+p.durability+a.fortitude+c.sizeToughness+c.thresholdMisc,
 damageResistance:h(a.fortitude)+c.armorResistance+c.resistanceMisc,
 psionicResistance:3*a.willpower+c.psiLevel+h(p.mentalTraining)+c.psionicMisc,
 moveSpeed:4+h(a.agility)+c.speedMisc,
 shiftSpeed:1+Math.floor(a.agility/5)+c.shiftMisc,
 initiative:Math.max(a.instinct,Number(s.skills.tactics.ranks))+c.initiativeMisc,
 moraleBonus:h(p.mentalTraining)+h(a.willpower)+c.moraleMisc};
 const skillTotals=Object.fromEntries(Object.entries(SKILL_ATTRIBUTES).map(([k,attr])=>[k,Number(s.skills[k].ranks)+a[attr]+Number(s.skills[k].misc)+Number(s.skills[k].temp)]));
 return {attributes:a,prowess:p,computed,skillTotals};
}

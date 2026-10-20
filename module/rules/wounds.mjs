export const LOCATIONS=["mobility","action","core","vital","critical"];
export const WOUND_RULES={
 mobility:{immediate:"Knocked prone (or loses flight control where applicable)",ongoing:"-1 speed, Athletics, Acrobatics, Stealth, Pilot per point; vehicle acceleration/max speed -10% per point"},
 action:{immediate:"Drop a one-handed item chosen by attacker",ongoing:"-1 attacks and physical interaction skill checks per point"},
 core:{immediate:"+5 damage (GM resolves)",ongoing:"-1 healing threshold per point"},
 vital:{immediate:"2 Bleed (GM resolves)",ongoing:"-1 Damage Resistance and regeneration per point"},
 critical:{immediate:"+10 damage (GM resolves)",ongoing:"-1 Defense, attacks and skill checks per point"}
};
export function woundLocation(die){return LOCATIONS[Math.min(4,Math.max(0,Math.floor((Number(die)-1)/4)))];}
export function woundState(actor){return actor.getFlag("leovaunt-starcraft","wounds")??{points:Object.fromEntries(LOCATIONS.map(k=>[k,0])),history:[]};}
export async function recordWounds(actor,{count=1,location=null,source="Physical damage",gmOverride=false}={}){
 const n=Math.trunc(Number(count));if(!Number.isSafeInteger(n)||n<1||n>100)throw Error("Wound count must be between 1 and 100.");
 if(location&&!LOCATIONS.includes(location))throw Error("Unknown wound location.");
 const old=woundState(actor),points={...Object.fromEntries(LOCATIONS.map(k=>[k,0])),...old.points};
 const rolls=[],history=[...(old.history??[])];
 // Standard single attacks put all points in one location; burst distribution is not automated.
 const roll=location?null:await new Roll("1d20").evaluate(),loc=location??woundLocation(roll.total);
 if(roll)rolls.push(roll);
 points[loc]=Math.max(0,Number(points[loc])||0)+n;
 history.push({time:Date.now(),location:loc,points:n,source,roll:roll?.total??null,override:gmOverride,by:game.user.id});
 await actor.setFlag("leovaunt-starcraft","wounds",{points,history:history.slice(-100)});
 return {location:loc,points:points[loc],rolls,dead:["core","vital","critical"].includes(loc)&&points[loc]>=5,maimed:["mobility","action"].includes(loc)&&points[loc]>=5};
}
export async function gmSetWoundPoints(actor,location,value){
 if(!game.user.isGM)throw Error("GM only");if(!LOCATIONS.includes(location))throw Error("Invalid location");
 const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>100)throw Error("Invalid points");
 const state=woundState(actor),before=Number(state.points?.[location]||0);
 await actor.setFlag("leovaunt-starcraft","wounds",{points:{...state.points,[location]:n},history:[...(state.history??[]),{time:Date.now(),location,points:n-before,source:"GM adjustment",override:true,by:game.user.id}].slice(-100)});
}

/** Numeric wound penalties. Never mutate stored base statistics. */
export function woundPenalties(points={}){
 const p=k=>Math.max(0,Math.trunc(Number(points[k])||0));
 const mobility=p("mobility"),action=p("action"),core=p("core"),vital=p("vital"),critical=p("critical");
 return {mobility,action,core,vital,critical,
  moveSpeed:mobility,healingThreshold:core,damageResistance:vital,
  defense:critical,attack:action+critical,
  allSkills:critical,
  skills:{athletics:mobility,acrobatics:mobility,stealth:mobility,pilot:mobility},
  // Action applies to physical interaction checks; this list is intentionally explicit.
  physicalSkills:["athletics","acrobatics","stealth","pilot"],
  regeneration:vital,vehicleSpeedPercent:mobility*10};
}
export function actorWoundPenalties(actor){return woundPenalties(woundState(actor).points);}
export function skillWoundPenalty(penalties,skill){
 return penalties.allSkills+(penalties.skills[skill]||0)+(penalties.physicalSkills.includes(skill)?penalties.action:0);
}

/** Immediate wound results are applied once on resolution, never during derived-stat calculation.
 * Extra damage bypasses a second wound roll; Bleed is tracked for start-of-turn GM application.
 * Prone/drop are advisory until the GM chooses a token status or inventory item. */
export function immediateWoundEffect(location,points=1){
 const n=Math.max(0,Math.trunc(Number(points)||0));
 return {bonusDamage:(location==="core"?5:location==="critical"?10:0)*n,
  bleed:location==="vital"?2*n:0,
  prone:location==="mobility",dropItem:location==="action"};
}
export function woundConditions(actor){return actor.getFlag("leovaunt-starcraft","woundConditions")??{bleed:0,prone:false};}
export async function applyImmediateWoundEffect(actor,location,count,{applyDamage=true}={}){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to modify target");
 const effect=immediateWoundEffect(location,count),old=woundConditions(actor);
 const hp=Math.max(0,Number(actor.system.resources.hp.value)||0);
 const hpLost=applyDamage?Math.min(hp,effect.bonusDamage):0;
 const next={...old,bleed:Math.max(0,Number(old.bleed)||0)+effect.bleed,prone:old.prone||effect.prone};
 // Do not feed bonus damage into resolvePhysicalDamage; that would double-count wounds.
 if(hpLost)await actor.update({"system.resources.hp.value":hp-hpLost});
 await actor.setFlag("leovaunt-starcraft","woundConditions",next);
 if(effect.prone)await setProneStatus(actor,true);
 return {...effect,hpLost,bleedTotal:next.bleed};
}
export async function gmSetWoundCondition(actor,key,value){
 if(!game.user.isGM)throw Error("GM only");
 if(!["bleed","prone"].includes(key))throw Error("Unsupported condition");
 const current=woundConditions(actor),next={...current};
 if(key==="bleed"){const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>1000)throw Error("Invalid Bleed value");next.bleed=n;}
 else next.prone=Boolean(value);
 await actor.setFlag("leovaunt-starcraft","woundConditions",next);
 if(key==="prone")await setProneStatus(actor,next.prone);
}
export async function applyBleedTick(actor){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to modify target");
 const bleed=Math.max(0,Number(woundConditions(actor).bleed)||0),hp=Math.max(0,Number(actor.system.resources.hp.value)||0);
 const lost=Math.min(hp,bleed);
 if(lost)await actor.update({"system.resources.hp.value":hp-lost});
 return {bleed,lost,remaining:hp-lost};
}

/** Eligible held weapons and gear. Armor and two-handed weapons cannot be dropped by this effect. */
export function droppableOneHandedItems(actor){
 return actor.items.filter(item=>["weapon","gear"].includes(item.type)&&item.system?.equipped&&Number(item.system?.hands??2)===1);
}
/** An unequip preserves the embedded item and its ammunition, quantity and other fields. */
export async function dropHeldItem(actor,itemId){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to change inventory.");
 const item=droppableOneHandedItems(actor).find(i=>i.id===itemId);
 if(!item)throw Error("Select an equipped one-handed item.");
 await item.update({"system.equipped":false});
 return item.name;
}
/** Sync a tracked prone flag with Foundry's core prone condition on the actor. */
export async function setProneStatus(actor,active){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to update conditions.");
 if(typeof actor.toggleStatusEffect!=="function")throw Error("Foundry actor status effects are unavailable.");
 if(actor.statuses.has("prone")!==Boolean(active))await actor.toggleStatusEffect("prone",{active:Boolean(active)});
 const previous=woundConditions(actor);
 if(previous.prone!==Boolean(active))await actor.setFlag("leovaunt-starcraft","woundConditions",{...previous,prone:Boolean(active)});
}

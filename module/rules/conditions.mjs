/** Leovaunt Core Rulebook pp. 180–184. Durations are explicit GM-managed
 * round counters; no combat-turn hook silently decrements them. */
export const CONDITION_DEFINITIONS={
 slowed:{label:"Slowed",icon:"icons/svg/downgrade.svg",description:"Movement costs twice as many squares (four in difficult terrain); −10 Acrobatics to evade."},
 staggered:{label:"Staggered",icon:"icons/svg/daze.svg",description:"Can perform only one standard action on their turn."},
 stunned:{label:"Stunned",icon:"icons/svg/unconscious.svg",description:"Cannot take actions or reactions. Not automatically prone or executable."},
 immobilized:{label:"Immobilized",icon:"icons/svg/net.svg",description:"Cannot move, shift, evade, sprint, or charge; flat-footed."},
 tormented:{label:"Tormented",icon:"icons/svg/terror.svg",description:"Disadvantage on attacks and checks; loses 2 morale on their turn."},
 hidden:{label:"Hidden",icon:"icons/svg/invisible.svg",description:"Enemies do not know square; attacks against are −5 with no overages; foes flat-footed against hidden attacker."},
 blinded:{label:"Blinded",icon:"icons/svg/blind.svg",description:"Blinded. GM adjudicates visibility and attacks per rulebook."},
 burning:{label:"Burning",icon:"icons/svg/fire.svg",description:"Burning. GM applies damage and extinguishing rules."},
 frozen:{label:"Frozen",icon:"icons/svg/frozen.svg",description:"Frozen. GM applies the appropriate severity and duration."},
 helpless:{label:"Helpless",icon:"icons/svg/paralysis.svg",description:"Helpless. GM adjudicates attack and movement restrictions."},
 melting:{label:"Melting",icon:"icons/svg/acid.svg",description:"Take 20 piercing damage and lose 1 morale at the start of each turn; removal by Acrobatics or full-round action."}
};
const NS="leovaunt-starcraft",KEY="combatConditions";
export function combatConditionState(actor){const stored=actor.getFlag(NS,KEY);return stored&&typeof stored==="object"&&!Array.isArray(stored)?stored:{};}
export function conditionActive(actor,id){return Boolean(combatConditionState(actor)[id]);}
export function conditionRows(actor){const state=combatConditionState(actor);return Object.entries(CONDITION_DEFINITIONS).map(([id,def])=>({id,...def,active:Boolean(state[id]),rounds:state[id]?.rounds??0}));}
export async function setCombatCondition(actor,id,{active=true,rounds=0}={}){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to edit target conditions.");
 if(!CONDITION_DEFINITIONS[id])throw Error("Unknown condition.");
 const n=Number(rounds);
 if(!Number.isSafeInteger(n)||n<0||n>999)throw Error("Duration must be 0–999 rounds (0 means indefinite).");
 const state={...combatConditionState(actor)};
 if(active)state[id]={rounds:n};else delete state[id];
 await actor.setFlag(NS,KEY,state);
 // A dedicated ActiveEffect provides a visible token status icon without
 // overwriting Foundry's own prone, grappled, or unconscious effects.
 const effect=actor.effects.find(e=>e.getFlag(NS,"conditionId")===id);
 if(active&&!effect){
  const def=CONDITION_DEFINITIONS[id];
  await actor.createEmbeddedDocuments("ActiveEffect",[{name:def.label,img:def.icon,disabled:false,flags:{[NS]:{conditionId:id}}}]);
 }else if(!active&&effect)await effect.delete();
 return {id,active:Boolean(active),rounds:n};
}
export async function advanceConditionRounds(actor){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to advance conditions.");
 const entries=Object.entries(combatConditionState(actor));
 const expired=[],updated=[];
 for(const [id,value] of entries){
  const rounds=Number(value?.rounds)||0;
  if(rounds===1){await setCombatCondition(actor,id,{active:false});expired.push(id);}
  else if(rounds>1){await setCombatCondition(actor,id,{active:true,rounds:rounds-1});updated.push(id);}
 }
 return {expired,updated};
}
export function conditionAttackBlocked(actor){return conditionActive(actor,"stunned")||conditionActive(actor,"helpless");}
export function conditionAttackDisadvantage(actor){return conditionActive(actor,"tormented");}
export function conditionSkillModifier(actor,skill){return conditionActive(actor,"slowed")&&skill==="acrobatics"?-10:0;}

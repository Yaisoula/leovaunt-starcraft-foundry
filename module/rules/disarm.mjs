import {calculateTerran} from "./terran.mjs";
import {woundState} from "./wounds.mjs";
const n=v=>Number(v)||0;
export function disarmAttackBonus(actor,weapon){
 const s=actor.system,terran=actor.type==="terran";
 const strength=terran?n(s.attributes.strength.base)+n(s.attributes.strength.misc):n(s.attributes.strength);
 const melee=terran?n(s.prowess.melee.ranks):n(s.prowess.melee);
 // For Terrans, the existing sizeToughness modifier represents the size modifier.
 // NPCs currently have no size field; the GM can enter a manual modifier.
 const size=terran?n(s.combat.sizeToughness):0;
 const hands=Math.max(1,n(weapon?.system?.hands)||1);
 const handBonus=hands>=2?5:2;
 return {base:melee+Math.floor(strength/2)+size,handBonus,total:melee+Math.floor(strength/2)+size+handBonus};
}
export function disarmTargetToughness(actor){
 if(!actor)return null;
 if(actor.type==="npc")return n(actor.system.defenses.toughness);
 if(actor.type==="terran")return calculateTerran(actor.system,actor.items,woundState(actor).points).computed.toughness;
 return null;
}
export function disarmResult(rollTotal,toughness,targetHands){
 const handBonus=Number(targetHands)>=2?5:2;
 const dc=Number(toughness)+handBonus;
 return {success:rollTotal>=dc,dc,margin:rollTotal-dc};
}

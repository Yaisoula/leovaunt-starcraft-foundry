import {calculateTerran} from "./terran.mjs";
import {woundState} from "./wounds.mjs";
const NS="leovaunt-starcraft";
const n=v=>Number(v)||0;
/** Grab uses Athletics (not the Melee special-attack bonus) plus the special-combat size modifier. */
export function grabAthletics(actor){
 if(actor.type!=="terran")return null; // NPC model has no Athletics skill yet.
 const s=actor.system;
 const derived=calculateTerran(s,actor.items,woundState(actor).points);
 return derived.skillTotals.athletics+n(s.combat.sizeToughness);
}
export function grabToughness(actor){
 if(!actor)return null;
 if(actor.type==="npc")return n(actor.system.defenses.toughness);
 if(actor.type==="terran"){
  const derived=calculateTerran(actor.system,actor.items,woundState(actor).points);
  return derived.computed.toughness+n(actor.system.combat.sizeToughness);
 }
 return null;
}
export function grabState(actor){return actor.getFlag(NS,"grabState")??null;}
export async function startGrab(attacker,victim){
 if(!attacker?.canUserModify(game.user,"update")||!victim?.canUserModify(game.user,"update"))throw Error("You need update permission for both actors to track the Grab. Ask the GM to resolve it manually.");
 if(grabState(attacker)||grabState(victim))throw Error("One participant is already in a tracked Grab. Multi-character Grabs are not automated.");
 await attacker.setFlag(NS,"grabState",{partnerId:victim.id,partnerName:victim.name,role:"holder"});
 try{await victim.setFlag(NS,"grabState",{partnerId:attacker.id,partnerName:attacker.name,role:"held"});}
 catch(error){await attacker.unsetFlag(NS,"grabState");throw error;}
}
export async function endGrab(actor){
 const state=grabState(actor);
 if(!state)return;
 if(!actor.canUserModify(game.user,"update"))throw Error("You cannot update this actor.");
 const partner=game.actors.get(state.partnerId);
 if(partner&&!partner.canUserModify(game.user,"update"))throw Error("You need permission to update both participants. Ask the GM to release the Grab.");
 await actor.unsetFlag(NS,"grabState");
 if(partner&&grabState(partner)?.partnerId===actor.id)await partner.unsetFlag(NS,"grabState");
}

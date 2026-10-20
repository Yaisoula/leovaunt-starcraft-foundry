/** Charging is a full-round action. Movement, flat-footed and evasion are GM adjudicated. */
export function chargeAttackModifiers(attack){
 return {accuracy:attack.accuracy+5,damage:attack.damage+(attack.melee?10:0)};
}
export function chargingState(actor){return Boolean(actor.getFlag("leovaunt-starcraft","chargingDefense"));}
export async function setChargingDefense(actor,active){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to update charging state.");
 await actor.setFlag("leovaunt-starcraft","chargingDefense",Boolean(active));
}
export function chargeDefensePenalty(actor){return chargingState(actor)?2:0;}

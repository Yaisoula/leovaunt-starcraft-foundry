/** Encounter morale is manually managed; wound resolution is the only automatic change. */
export function moraleValue(actor){return Math.max(-5,Math.min(5,Math.trunc(Number(actor.system.resources.morale??1))));}
export async function adjustMorale(actor,delta){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to edit Morale.");
 if(!Number.isSafeInteger(delta)||Math.abs(delta)!==1)throw Error("Morale adjustment must be +1 or -1.");
 const before=moraleValue(actor),after=Math.max(-5,Math.min(5,before+delta));
 if(after!==before)await actor.update({"system.resources.morale":after});
 return {before,after};
}
export async function applyWoundMorale(actor){
 if(!actor.canUserModify(game.user,"update"))throw Error("No permission to update wound Morale.");
 const before=moraleValue(actor),after=Math.max(-5,before-1);
 if(after!==before)await actor.update({"system.resources.morale":after});
 return {before,after};
}

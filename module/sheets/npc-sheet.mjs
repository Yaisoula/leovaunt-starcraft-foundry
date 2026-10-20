import {chargeAttackModifiers,chargingState,setChargingDefense} from "../rules/charging.mjs";
import {permanentWoundState,applyWoundThreshold,gmSetDeceased,gmUpdatePermanentInjury} from "../rules/wounds.mjs";
import {LOCATIONS,WOUND_RULES,woundState,recordWounds,gmSetWoundPoints,woundConditions,applyImmediateWoundEffect,gmSetWoundCondition,applyBleedTick,droppableOneHandedItems,dropHeldItem} from "../rules/wounds.mjs";
import {actorWoundPenalties} from "../rules/wounds.mjs";
import {weaponAttack,resolveWeaponDamage} from "../rules/weapon-attacks.mjs";
import {targetProfile,previewPhysicalDamage,attackDetailHtml,traitsForWeapon} from "../rules/targeting.mjs";
import {resolvePhysicalDamage} from "../rules/damage.mjs";
export class NpcSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud","npc-hud"],position:{width:760,height:700},window:{resizable:true,title:"StarCraft NPC Record"},form:{submitOnChange:true,closeOnSubmit:false,handler:NpcSheet.save},actions:{rollNpcAttack:NpcSheet.rollNpcAttack,toggleChargingDefense:NpcSheet.toggleChargingDefense,applyNpcDamage:NpcSheet.applyNpcDamage,reloadNpcWeapon:NpcSheet.reloadNpcWeapon,resolveWounds:NpcSheet.resolveWounds,adjustWound:NpcSheet.adjustWound,applyBleedTick:NpcSheet.applyBleedTick,setWoundCondition:NpcSheet.setWoundCondition,setDeceased:NpcSheet.setDeceased,editPermanentInjury:NpcSheet.editPermanentInjury,removePermanentInjury:NpcSheet.removePermanentInjury}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/npc-sheet.hbs"}};
 async _prepareContext(options){const context=await super._prepareContext(options);return {...context,actor:this.document,s:this.document.system,effectiveDefenses:{defense:this.document.system.defenses.defense-actorWoundPenalties(this.document).defense-(chargingState(this.document)?2:0),damageResistance:Math.max(0,this.document.system.defenses.damageResistance-actorWoundPenalties(this.document).damageResistance)},woundRows:LOCATIONS.map(key=>({key,label:key[0].toUpperCase()+key.slice(1),points:woundState(this.document).points?.[key]??0,immediate:WOUND_RULES[key].immediate,ongoing:WOUND_RULES[key].ongoing})),woundHistory:[...(woundState(this.document).history??[])].reverse().slice(0,15),permanentWounds:permanentWoundState(this.document),chargingDefense:chargingState(this.document),isGM:game.user.isGM,woundConditions:woundConditions(this.document),items:this.document.items.filter(i=>i.type==="weapon").map(i=>({id:i.id,name:i.name,attack:weaponAttack(this.document.system,i,woundState(this.document).points),range:i.system.range,rate:i.system.rateOfFire}))};}
 static async save(event,form,formData){await this.document.update(formData.object);}
 static async rollNpcAttack(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);if(!item||item.type!=="weapon")return;
  const a=weaponAttack(this.document.system,item,woundState(this.document).points);
  if(!a.supported||!a.canFire){ui.notifications.warn("Unsupported firing mode or insufficient ammunition.");return;}
  const selected=Array.from(game.user.targets),profile=selected.length===1?targetProfile(selected[0]?.actor):null;
  if(selected.length===1&&!profile){ui.notifications.warn("Only Terran and NPC token targets have automated Defense.");return;}
  const charge=this.element.querySelector("[data-npc-charge]")?.checked===true;
  const actionMove=!charge&&this.element.querySelector("[data-npc-action-move]")?.checked===true;
  const chargeMods=charge?chargeAttackModifiers(a):null;
  if(charge)await setChargingDefense(this.document,true);
  const roll=await new Roll("1d20 + @bonus",{bonus:(chargeMods?.accuracy??a.accuracy)-(actionMove?2:0)}).evaluate();
  if(a.requiresAmmo)await item.update({"system.currentShots":a.ammo-a.ammoNeeded});
  const outcome=profile?resolveWeaponDamage(chargeMods?{...a,damage:chargeMods.damage}:a,roll.total,profile.defense):null,traits=traitsForWeapon(item);
  const preview=outcome?.hit?previewPhysicalDamage(profile,outcome.damage,traits):null;
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],flavor:foundry.utils.escapeHTML(item.name)+(charge?" — Charge (+5 accuracy, melee +10 damage) — defense −2 until next turn":actionMove?" — Action Move (−2 accuracy)":" — NPC Attack"),content:attackDetailHtml({name:item.name,attack:chargeMods?{...a,damage:chargeMods.damage}:a,outcome,target:profile,traits,preview})});
  if(traits.hasUnsupportedEffects)ui.notifications.warn("Special weapon traits require GM review.");
  await this.render();
 }
 static async reloadNpcWeapon(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);if(!item||item.type!=="weapon")return;
  const max=Number(item.system.shots)||0;if(max<=0)return;
  await item.update({"system.currentShots":max});
  ui.notifications.info("Magazine refilled; reserve ammunition and action costs are not tracked.");
  await this.render();
 }
 static async applyNpcDamage(event,target){if(!this.isEditable)return;const input=this.element.querySelector("[data-npc-damage]");const damage=Number(input?.value);if(!Number.isSafeInteger(damage)||damage<0){ui.notifications.warn("Enter a whole nonnegative damage value.");return;}const s=this.document.system;const result=resolvePhysicalDamage({damage,shield:s.resources.shields.value,shieldArmor:s.defenses.shieldArmor,resistance:s.defenses.damageResistance-actorWoundPenalties(this.document).damageResistance,protection:s.resources.protection,hp:s.resources.hp.value,threshold:s.defenses.damageThreshold});const approved=await foundry.applications.api.DialogV2.confirm({window:{title:"Apply NPC Damage"},content:"Apply "+damage+" damage to "+foundry.utils.escapeHTML(this.document.name)+"? Shields -"+result.shieldAbsorbed+", HP -"+result.hpLost+", pending wounds +"+result.wounds+"."});if(!approved)return;await this.document.update({"system.resources.shields.value":result.shieldRemaining,"system.resources.hp.value":result.hpRemaining,"system.resources.protection":result.protectionRemaining,"system.resources.woundsPending":Number(s.resources.woundsPending||0)+result.wounds});await this.render();}
 static async resolveWounds(){
  if(!this.isEditable)return;const actor=this.document,count=Number(actor.system.resources.woundsPending||0);
  if(!Number.isSafeInteger(count)||count<=0){ui.notifications.warn("No pending wounds.");return;}
  const result=await recordWounds(actor,{count,source:"Pending physical damage"});
  await actor.update({"system.resources.woundsPending":0});
  const immediate=await applyImmediateWoundEffect(actor,result.location,count);
  const threshold=await applyWoundThreshold(actor,result);
  if(threshold.added)ui.notifications.warn(threshold.added+" permanent maiming injury record(s) created; GM must describe affected anatomy.");
  if(threshold.deceased)ui.notifications.error(actor.name+" has reached a lethal wound threshold and is marked deceased.");
  if(immediate.dropItem)await this.chooseDroppedItem(actor);
  const rule=WOUND_RULES[result.location];await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:"<strong>"+foundry.utils.escapeHTML(actor.name)+"</strong>: "+count+" wound point(s) to "+result.location+" ("+(result.rolls[0]?.total??"GM")+")<p>Immediate: "+rule.immediate+"</p><p>Ongoing: "+rule.ongoing+"</p>"+(result.dead?"<strong>Death/destruction threshold reached — GM review required.</strong>":result.maimed?"<strong>Maiming threshold reached — GM review required.</strong>":"")});
  await this.render();
 }
 static async adjustWound(event,target){
  if(!game.user.isGM)return;const loc=target.dataset.location,input=this.element.querySelector('[data-wound-points="'+loc+'"]');try{await gmSetWoundPoints(this.document,loc,input?.value);await this.render();}catch(err){ui.notifications.error(err.message);}
 }

 static async applyBleedTick(){
  if(!this.isEditable)return;
  const amount=woundConditions(this.document).bleed;
  if(!amount){ui.notifications.info("No Bleed damage to apply.");return;}
  const yes=await foundry.applications.api.DialogV2.confirm({window:{title:"Apply Bleed at Turn Start"},content:"Apply "+amount+" Bleed damage to "+foundry.utils.escapeHTML(this.document.name)+"? Bleed ignores Damage Resistance and does not create crippling wounds."});
  if(!yes)return;
  const result=await applyBleedTick(this.document);
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),content:foundry.utils.escapeHTML(this.document.name)+" takes "+result.lost+" Bleed damage (Bleed "+result.bleed+")."});
  await this.render();
 }
 static async setWoundCondition(event,target){
  if(!game.user.isGM)return;
  const key=target.dataset.condition;
  const field=this.element.querySelector('[data-wound-condition="'+key+'"]');
  try{await gmSetWoundCondition(this.document,key,key==="prone"?field?.checked:field?.value);await this.render();}catch(err){ui.notifications.error(err.message);}
 }

 static async chooseDroppedItem(actor){
  const items=droppableOneHandedItems(actor);
  if(!items.length){ui.notifications.info("Action wound: no equipped one-handed items found. GM adjudication required.");return;}
  const options=items.map(item=>'<option value="'+foundry.utils.escapeHTML(item.id)+'">'+foundry.utils.escapeHTML(item.name)+'</option>').join("");
  const chosen=await foundry.applications.api.DialogV2.prompt({
   window:{title:"Action Wound — Drop One-Handed Item"},
   content:'<p>The attacker chooses one held one-handed item to drop. Cancel to leave inventory unchanged.</p><label>Item<select name="droppedItem">'+options+'</select></label>',
   ok:{label:"Drop Item",callback:(event,button)=>button.form.elements.droppedItem.value},
   rejectClose:false
  });
  if(!chosen)return;
  try{
   const name=await dropHeldItem(actor,chosen);
   await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:foundry.utils.escapeHTML(actor.name)+" drops "+foundry.utils.escapeHTML(name)+" due to an Action wound (unequipped, not deleted)."});
  }catch(err){ui.notifications.error(err.message);}
 }

 static async setDeceased(event,target){
  if(!game.user.isGM)return;
  const checked=this.element.querySelector('[data-permanent-deceased]')?.checked;
  await gmSetDeceased(this.document,checked);await this.render();
 }
 static async editPermanentInjury(event,target){
  if(!game.user.isGM)return;
  const id=target.dataset.injuryId;
  const description=this.element.querySelector('[data-permanent-injury="'+id+'"]')?.value;
  try{await gmUpdatePermanentInjury(this.document,id,{description});await this.render();}catch(err){ui.notifications.error(err.message);}
 }
 static async removePermanentInjury(event,target){
  if(!game.user.isGM)return;
  const id=target.dataset.injuryId;
  const yes=await foundry.applications.api.DialogV2.confirm({window:{title:"Remove Permanent Injury"},content:"Remove this permanent injury record? This will not change wound points."});
  if(!yes)return;
  try{await gmUpdatePermanentInjury(this.document,id,{remove:true});await this.render();}catch(err){ui.notifications.error(err.message);}
 }

 static async toggleChargingDefense(){
  if(!this.isEditable)return;
  try{await setChargingDefense(this.document,false);await this.render();}catch(err){ui.notifications.error(err.message);}
 }

}

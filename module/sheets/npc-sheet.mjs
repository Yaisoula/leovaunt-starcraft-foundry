import {weaponAttack,resolveWeaponDamage} from "../rules/weapon-attacks.mjs";
import {targetProfile,previewPhysicalDamage,attackDetailHtml,traitsForWeapon} from "../rules/targeting.mjs";
import {resolvePhysicalDamage} from "../rules/damage.mjs";
export class NpcSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud","npc-hud"],position:{width:760,height:700},window:{resizable:true,title:"StarCraft NPC Record"},form:{submitOnChange:true,closeOnSubmit:false,handler:NpcSheet.save},actions:{rollNpcAttack:NpcSheet.rollNpcAttack,applyNpcDamage:NpcSheet.applyNpcDamage,reloadNpcWeapon:NpcSheet.reloadNpcWeapon}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/npc-sheet.hbs"}};
 async _prepareContext(options){const context=await super._prepareContext(options);return {...context,actor:this.document,s:this.document.system,items:this.document.items.filter(i=>i.type==="weapon").map(i=>({id:i.id,name:i.name,attack:weaponAttack(this.document.system,i),range:i.system.range,rate:i.system.rateOfFire}))};}
 static async save(event,form,formData){await this.document.update(formData.object);}
 static async rollNpcAttack(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);if(!item||item.type!=="weapon")return;
  const a=weaponAttack(this.document.system,item);
  if(!a.supported||!a.canFire){ui.notifications.warn("Unsupported firing mode or insufficient ammunition.");return;}
  const selected=Array.from(game.user.targets),profile=selected.length===1?targetProfile(selected[0]?.actor):null;
  if(selected.length===1&&!profile){ui.notifications.warn("Only Terran and NPC token targets have automated Defense.");return;}
  const roll=await new Roll("1d20 + @bonus",{bonus:a.accuracy}).evaluate();
  if(a.requiresAmmo)await item.update({"system.currentShots":a.ammo-a.ammoNeeded});
  const outcome=profile?resolveWeaponDamage(a,roll.total,profile.defense):null,traits=traitsForWeapon(item);
  const preview=outcome?.hit?previewPhysicalDamage(profile,outcome.damage,traits):null;
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],flavor:foundry.utils.escapeHTML(item.name)+" — NPC Attack",content:attackDetailHtml({name:item.name,attack:a,outcome,target:profile,traits,preview})});
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
 static async applyNpcDamage(event,target){if(!this.isEditable)return;const input=this.element.querySelector("[data-npc-damage]");const damage=Number(input?.value);if(!Number.isSafeInteger(damage)||damage<0){ui.notifications.warn("Enter a whole nonnegative damage value.");return;}const s=this.document.system;const result=resolvePhysicalDamage({damage,shield:s.resources.shields.value,shieldArmor:s.defenses.shieldArmor,resistance:s.defenses.damageResistance,protection:s.resources.protection,hp:s.resources.hp.value,threshold:s.defenses.damageThreshold});const approved=await foundry.applications.api.DialogV2.confirm({window:{title:"Apply NPC Damage"},content:"Apply "+damage+" damage to "+foundry.utils.escapeHTML(this.document.name)+"? Shields -"+result.shieldAbsorbed+", HP -"+result.hpLost+", pending wounds +"+result.wounds+"."});if(!approved)return;await this.document.update({"system.resources.shields.value":result.shieldRemaining,"system.resources.hp.value":result.hpRemaining,"system.resources.protection":result.protectionRemaining,"system.resources.woundsPending":Number(s.resources.woundsPending||0)+result.wounds});await this.render();}
}

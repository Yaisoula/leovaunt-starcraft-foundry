import {permanentWoundState,applyWoundThreshold,gmSetDeceased,gmUpdatePermanentInjury} from "../rules/wounds.mjs";
import {LOCATIONS,WOUND_RULES,woundState,recordWounds,gmSetWoundPoints,woundConditions,applyImmediateWoundEffect,gmSetWoundCondition,applyBleedTick,droppableOneHandedItems,dropHeldItem} from "../rules/wounds.mjs";
import {targetProfile,previewPhysicalDamage} from "../rules/targeting.mjs";
import {resolvePhysicalDamage,parsePhysicalTraits} from "../rules/damage.mjs";
import {weaponAttack,resolveWeaponDamage} from "../rules/weapon-attacks.mjs";
import {calculateTerran,ATTRIBUTE_LABELS,SKILL_ATTRIBUTES,PROWESS_LABELS,label} from "../rules/terran.mjs";
export class TerranSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud"],position:{width:1000,height:760},window:{resizable:true,title:"Terran Personnel HUD"},form:{submitOnChange:true,closeOnSubmit:false,handler:TerranSheet.onFormSubmit},actions:{rollSkill:TerranSheet.rollSkill,rollAttribute:TerranSheet.rollAttribute,changeTab:TerranSheet.changeTab,toggleEquipped:TerranSheet.toggleEquipped,createEquipment:TerranSheet.createEquipment,saveEquipment:TerranSheet.saveEquipment,removeEquipment:TerranSheet.removeEquipment,toggleEquipmentDetails:TerranSheet.toggleEquipmentDetails,editEquipment:TerranSheet.editEquipment,toggleEquipmentMenu:TerranSheet.toggleEquipmentMenu,attackWeapon:TerranSheet.attackWeapon,reloadWeapon:TerranSheet.reloadWeapon,chooseItemImage:TerranSheet.chooseItemImage,applyPhysicalDamage:TerranSheet.applyPhysicalDamage,resolveWounds:TerranSheet.resolveWounds,adjustWound:TerranSheet.adjustWound,applyBleedTick:TerranSheet.applyBleedTick,setWoundCondition:TerranSheet.setWoundCondition,setDeceased:TerranSheet.setDeceased,editPermanentInjury:TerranSheet.editPermanentInjury,removePermanentInjury:TerranSheet.removePermanentInjury}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/terran-sheet.hbs"}};
 _activeTab="overview";
 _damageDraft={damage:0,penetration:0,rending:0};
 _expandedEquipment=new Set();
 _editingEquipment=new Set();
 _menuEquipment=null;
 static async changeTab(event,target){const next=target.dataset.tab;if(!["overview","skills","combat","inventory","talents","progression","psionics","bio"].includes(next))return;this._activeTab=next;await this.render();}
 async _prepareContext(options){const context=await super._prepareContext(options),actor=this.document,s=actor.system,d=calculateTerran(s,actor.items,woundState(actor).points);
 const powerLevels=[{key:"heroic",name:"Heroic",starting:25,perLevel:4,hp:40},{key:"advanced",name:"Advanced Heroic",starting:32,perLevel:5,hp:40},{key:"epic",name:"Epic Heroic",starting:40,perLevel:6,hp:40}];
 return {...context,actor,s,derived:d,damageDraft:this._damageDraft,powerLevels:powerLevels.map(t=>({...t,selected:s.powerLevel===t.key})),selectedPower:powerLevels.find(t=>t.key===s.powerLevel)||powerLevels[0],woundRows:LOCATIONS.map(key=>({key,label:key[0].toUpperCase()+key.slice(1),points:woundState(this.document).points?.[key]??0,immediate:WOUND_RULES[key].immediate,ongoing:WOUND_RULES[key].ongoing})),woundHistory:[...(woundState(this.document).history??[])].reverse().slice(0,15),permanentWounds:permanentWoundState(this.document),isGM:game.user.isGM,woundConditions:woundConditions(this.document),combatWeapons:actor.items.filter(item=>item.type==="weapon"&&item.system.equipped).map(item=>({id:item.id,name:item.name,range:item.system.range,rate:item.system.rateOfFire,attack:weaponAttack(s,item,woundState(actor).points)})),inventory:actor.items.filter(item=>["weapon","armor","gear"].includes(item.type)).map(item=>({id:item.id,name:item.name,type:item.type,equipped:Boolean(item.system.equipped),quantity:item.system.quantity,weight:item.system.weight,cost:item.system.cost,tier:item.system.tier,weaponClass:item.system.weaponClass,hands:item.system.hands,damage:item.system.damage,accuracy:item.system.accuracy,rateOfFire:item.system.rateOfFire,range:item.system.range,shots:item.system.shots,currentShots:item.system.currentShots,ammunition:item.system.ammunition,powerRating:item.system.powerRating,specialTraits:item.system.specialTraits,armorResistance:item.system.armorResistance,armorDefensePenalty:item.system.armorDefensePenalty,armorType:item.system.armorType,armorRating:item.system.armorRating,notes:item.system.notes,img:item.img,expanded:this._expandedEquipment.has(item.id),editing:this._editingEquipment.has(item.id),menuOpen:this._menuEquipment===item.id})),tab:this._activeTab,tabs:["overview","skills","combat","inventory","talents","progression","psionics","bio"].map(key=>({key,title:key[0].toUpperCase()+key.slice(1),active:key===this._activeTab})),
 attributes:Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>({key,name,base:s.attributes[key].base,misc:s.attributes[key].misc,total:d.attributes[key]})),
 skills:Object.entries(SKILL_ATTRIBUTES).map(([key,attribute])=>({key,name:label(key),attribute:ATTRIBUTE_LABELS[attribute],ranks:s.skills[key].ranks,misc:s.skills[key].misc,total:d.skillTotals[key],focus:s.skills[key].focus,max:d.limits[key],over:Number(s.skills[key].ranks)>d.limits[key]})),
 prowess:Object.entries(PROWESS_LABELS).map(([key,name])=>({key,name,ranks:s.prowess[key].ranks,focus:s.prowess[key].focus,max:d.prowessLimits[key],over:Number(s.prowess[key].ranks)>d.prowessLimits[key]}))};}
 static async toggleEquipped(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item || !["weapon","armor","gear"].includes(item.type))return;await item.update({"system.equipped":!Boolean(item.system.equipped)});await this.render();}
 static async createEquipment(event,target){if(!this.isEditable)return;const type=target.dataset.itemType;if(!["weapon","armor","gear"].includes(type))return;const created=await this.document.createEmbeddedDocuments("Item",[{name:type==="weapon"?"New Weapon":type==="armor"?"New Armor":"New Gear",type,system:{}}]);for(const item of created){this._expandedEquipment.add(item.id);this._editingEquipment.add(item.id);}await this.render();}
 static async saveEquipment(event,target){if(!this.isEditable)return;const row=target.closest("[data-equipment-id]");if(!row)return;const item=this.document.items.get(row.dataset.equipmentId);if(!item || !["weapon","armor","gear"].includes(item.type))return;
 const allowed={weapon:["quantity","weight","cost","tier","weaponClass","hands","damage","accuracy","rateOfFire","range","shots","currentShots","ammunition","powerRating","specialTraits","notes"],armor:["quantity","weight","cost","tier","armorResistance","armorDefensePenalty","armorType","armorRating","specialTraits","notes"],gear:["quantity","weight","cost","tier","specialTraits","notes"]}[item.type];
 const numeric=new Set(["quantity","weight","cost","tier","hands","damage","accuracy","shots","currentShots","powerRating","armorResistance","armorDefensePenalty","armorRating"]);
 const nameField=row.querySelector("[data-item-name]");const nextName=nameField?.value.trim();if(!nextName){ui.notifications.warn("Item name cannot be empty.");return;}
 const update={name:nextName};
 for(const input of row.querySelectorAll("[data-item-field]")){const k=input.dataset.itemField;if(!allowed.includes(k))continue;const value=numeric.has(k)?Number(input.value):input.value;if(numeric.has(k)&&!Number.isFinite(value)){ui.notifications.warn("Invalid number in "+k);return;}update["system."+k]=value;}
 await item.update(update);this._editingEquipment.delete(item.id);this._expandedEquipment.delete(item.id);this._menuEquipment=null;ui.notifications.info(nextName+" saved.");await this.render();}
 static async removeEquipment(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item || !["weapon","armor","gear"].includes(item.type))return;const ok=await foundry.applications.api.DialogV2.confirm({window:{title:"Delete Equipment"},content:"Permanently delete "+foundry.utils.escapeHTML(item.name)+" from this character?"});if(!ok)return;await item.delete();this._expandedEquipment.delete(item.id);this._editingEquipment.delete(item.id);this._menuEquipment=null;await this.render();}
 static async attackWeapon(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);
  if(!item||item.type!=="weapon"||!item.system.equipped)return;
  const a=weaponAttack(this.document.system,item,woundState(this.document).points);
  if(!a.supported){ui.notifications.warn("This weapon firing mode is not yet automated.");return;}
  if(!a.canFire){ui.notifications.warn("Not enough ammunition for a standard attack. Reload or change weapons.");return;}
  const selected=Array.from(game.user.targets);
  const profile=selected.length===1?targetProfile(selected[0]?.actor):null;
  if(selected.length===1&&!profile){ui.notifications.warn("Automated targeting supports Terran and NPC tokens.");return;}
  const input=target.closest(".hud-combat-weapon")?.querySelector("[data-target-defense]");
  const defenseText=input?.value?.trim()??"";
  const defense=profile?Number(profile.defense):(defenseText===""?null:Number(defenseText));
  if(defense!==null&&(!Number.isFinite(defense)||defense<0)){ui.notifications.warn("Target Defense must be a nonnegative number.");return;}
  const actionMove=target.closest(".hud-combat-weapon")?.querySelector("[data-action-move]")?.checked===true;
  const roll=await new Roll("1d20 + @bonus",{bonus:a.accuracy-(actionMove?2:0)}).evaluate();
  if(a.requiresAmmo)await item.update({"system.currentShots":a.ammo-a.ammoNeeded});
  const esc=foundry.utils.escapeHTML,traits=parsePhysicalTraits(item.system.specialTraits);
  let breakdown='<div class="sc-attack-details"><strong>'+esc(item.name)+(actionMove?' — Action Move (−2 accuracy; movement GM-controlled)':'')+'</strong><p>Strikes: '+a.strikes+' · Ammunition used: '+a.ammoNeeded+'</p>';
  if(defense!==null){
    const outcome=resolveWeaponDamage(a,roll.total,defense);
    breakdown+='<p><strong>'+(outcome.hit?'HIT':'MISS')+'</strong> vs Defense '+defense+(profile?' ('+esc(profile.actor.name)+')':'')+'</p>';
    if(outcome.hit){
      breakdown+='<p>Weapon and tier damage: '+a.damage+'<br>Attack overage: +'+outcome.overage+' (max '+a.overageCap+')<br><strong>Total physical damage before resistance: '+outcome.damage+'</strong><br>Penetration: '+traits.penetration+' · Rending: '+traits.rending+'</p>';
      this._damageDraft={damage:outcome.damage,penetration:traits.penetration,rending:traits.rending};
      if(profile){const dr=previewPhysicalDamage(profile,outcome.damage,traits);breakdown+='<p>Target preview: Shields -'+dr.shieldAbsorbed+' · Protection -'+dr.protectionAbsorbed+' · HP -'+dr.hpLost+' · Pending wounds +'+dr.wounds+'</p>';}
    }else breakdown+='<p>No damage.</p>';
  }else breakdown+='<p>Target Defense not provided; damage calculation pending.</p>';
  breakdown+='<small>Damage is not applied automatically. Confirm it in the physical damage section. Special traits and wound effects require GM review.</small></div>';
  if(traits.hasUnsupportedEffects)ui.notifications.warn("Some weapon traits require manual damage resolution.");
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],content:breakdown,flavor:esc(item.name)+" — Attack"});
  await this.render();
 }
 static async reloadWeapon(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);
  if(!item||item.type!=="weapon"||!item.system.equipped)return;
  const capacity=Math.max(0,Number(item.system.shots)||0);
  if(!capacity){ui.notifications.warn("This weapon has no configured magazine.");return;}
  await item.update({"system.currentShots":capacity});
  ui.notifications.info("Magazine reset to full. Reserve ammunition and reload actions are not yet tracked.");
  await this.render();
 }
 static async toggleEquipmentDetails(event,target){const id=target.dataset.itemId;if(!this.document.items.has(id))return;if(this._expandedEquipment.has(id)){this._expandedEquipment.delete(id);this._editingEquipment.delete(id);}else{this._expandedEquipment.add(id);}this._menuEquipment=null;await this.render();}
 static async editEquipment(event,target){if(!this.isEditable)return;const id=target.dataset.itemId;if(!this.document.items.has(id))return;this._expandedEquipment.add(id);this._editingEquipment.add(id);this._menuEquipment=null;await this.render();}
 static async toggleEquipmentMenu(event,target){const id=target.dataset.itemId;if(!this.document.items.has(id))return;this._menuEquipment=this._menuEquipment===id?null:id;await this.render();}
 async _onRender(context,options){await super._onRender(context,options);const root=this.element;root?.querySelectorAll("[data-quantity-item-id]").forEach(input=>{input.addEventListener("change",event=>this.saveQuantity(event,input));});root?.querySelectorAll("[data-equipment-id]").forEach(row=>{row.addEventListener("contextmenu",event=>{if(event.target.closest("input,select,textarea"))return;event.preventDefault();this._menuEquipment=row.dataset.equipmentId;this.render();});});}
 async saveQuantity(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.quantityItemId);if(!item||!["weapon","armor","gear"].includes(item.type))return;const input=target;const value=Number(input?.value);if(!Number.isSafeInteger(value)||value<0){ui.notifications.warn("Quantity must be a whole number of 0 or more.");return;}if(value!==item.system.quantity)await item.update({"system.quantity":value});}
 static async chooseItemImage(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item||!["weapon","armor","gear"].includes(item.type))return;const Picker=foundry.applications.apps.FilePicker;const picker=new Picker({type:"image",current:item.img,callback:async path=>{await item.update({img:path});await this.render();}});picker.render(true);}
 static async applyPhysicalDamage(event,target){
  if(!this.isEditable)return;
  const selected=Array.from(game.user.targets);
  if(selected.length!==1){ui.notifications.warn("Target exactly one Terran or NPC token to apply damage.");return;}
  const defender=selected[0]?.actor;
  if(!defender||!["terran","npc"].includes(defender.type)){ui.notifications.warn("Damage application currently supports Terran and NPC targets.");return;}
  if(!defender.canUserModify(game.user,"update")){ui.notifications.warn("You need permission to modify the targeted actor. Ask the GM to apply the damage.");return;}
  const section=target.closest(".hud-damage-application");
  const read=key=>Number(section?.querySelector('[data-damage-field="'+key+'"]')?.value);
  const damage=read("damage"),penetration=read("penetration"),rending=read("rending");
  if(![damage,penetration,rending].every(n=>Number.isSafeInteger(n)&&n>=0)){ui.notifications.warn("Enter nonnegative whole numbers for damage, penetration and rending.");return;}
  const state=defender.system,derived=defender.type==="terran"?calculateTerran(state,defender.items,woundState(defender).points):null;
  const damageResistance=derived?derived.computed.damageResistance:state.defenses.damageResistance;
  const shieldArmor=derived?state.combat.shieldArmor:state.defenses.shieldArmor;
  const damageThreshold=derived?derived.computed.damageThreshold:state.defenses.damageThreshold;
  const result=resolvePhysicalDamage({damage,penetration,rending,shield:state.resources.shields.value,shieldArmor,
   resistance:damageResistance,protection:state.resources.protection,hp:state.resources.hp.value,threshold:damageThreshold});
  const confirm=await foundry.applications.api.DialogV2.confirm({window:{title:"Apply Physical Damage"},content:
   "<p><strong>"+foundry.utils.escapeHTML(defender.name)+"</strong>: "+damage+" physical damage.</p>"+
   "<p>Shields: -"+result.shieldAbsorbed+"; Protection: -"+result.protectionAbsorbed+"; HP: -"+result.hpLost+".</p>"+
   "<p>Potential crippling wound points: "+result.wounds+" (location and effects require GM review).</p>"});
  if(!confirm)return;
  await defender.update({"system.resources.shields.value":result.shieldRemaining,"system.resources.protection":result.protectionRemaining,
   "system.resources.hp.value":result.hpRemaining,"system.resources.woundsPending":Number(state.resources.woundsPending||0)+result.wounds});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),content:
   "<strong>Physical damage → "+foundry.utils.escapeHTML(defender.name)+"</strong><p>Raw "+result.raw+
   ", shield absorbed "+result.shieldAbsorbed+", effective DR "+result.effectiveResistance+
   ", protection absorbed "+result.protectionAbsorbed+", HP lost "+result.hpLost+
   ", pending wound points "+result.wounds+". Wound locations and special traits require GM review.</p>"});
  await this.render();
 }
 static async onFormSubmit(event,form,formData){await this.document.update(formData.object);}
 static async rollSkill(event,target){const k=target.dataset.skill,d=calculateTerran(this.document.system,this.document.items,woundState(this.document).points);if(!(k in d.skillTotals))return;await new Roll(`1d20 + ${d.skillTotals[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${label(k)} check`});}
 static async rollAttribute(event,target){const k=target.dataset.attribute,d=calculateTerran(this.document.system);if(!(k in d.attributes))return;await new Roll(`1d20 + ${d.attributes[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${ATTRIBUTE_LABELS[k]} check`});}
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

}

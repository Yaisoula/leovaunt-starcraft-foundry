import {weaponAttack} from "../rules/weapon-attacks.mjs";
import {calculateTerran,ATTRIBUTE_LABELS,SKILL_ATTRIBUTES,PROWESS_LABELS,label} from "../rules/terran.mjs";
export class TerranSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud"],position:{width:1000,height:760},window:{resizable:true,title:"Terran Personnel HUD"},form:{submitOnChange:true,closeOnSubmit:false,handler:TerranSheet.onFormSubmit},actions:{rollSkill:TerranSheet.rollSkill,rollAttribute:TerranSheet.rollAttribute,changeTab:TerranSheet.changeTab,toggleEquipped:TerranSheet.toggleEquipped,createEquipment:TerranSheet.createEquipment,saveEquipment:TerranSheet.saveEquipment,removeEquipment:TerranSheet.removeEquipment,attackWeapon:TerranSheet.attackWeapon,reloadWeapon:TerranSheet.reloadWeapon}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/terran-sheet.hbs"}};
 _activeTab="overview";
 static async changeTab(event,target){const next=target.dataset.tab;if(!["overview","skills","combat","inventory","talents","progression","psionics"].includes(next))return;this._activeTab=next;await this.render();}
 async _prepareContext(options){const context=await super._prepareContext(options),actor=this.document,s=actor.system,d=calculateTerran(s,actor.items);
 return {...context,actor,s,derived:d,combatWeapons:actor.items.filter(item=>item.type==="weapon"&&item.system.equipped).map(item=>({id:item.id,name:item.name,range:item.system.range,rate:item.system.rateOfFire,attack:weaponAttack(s,item)})),inventory:actor.items.filter(item=>["weapon","armor","gear"].includes(item.type)).map(item=>({id:item.id,name:item.name,type:item.type,equipped:Boolean(item.system.equipped),quantity:item.system.quantity,weight:item.system.weight,cost:item.system.cost,tier:item.system.tier,weaponClass:item.system.weaponClass,hands:item.system.hands,damage:item.system.damage,accuracy:item.system.accuracy,rateOfFire:item.system.rateOfFire,range:item.system.range,shots:item.system.shots,currentShots:item.system.currentShots,ammunition:item.system.ammunition,powerRating:item.system.powerRating,specialTraits:item.system.specialTraits,armorResistance:item.system.armorResistance,armorDefensePenalty:item.system.armorDefensePenalty,armorType:item.system.armorType,armorRating:item.system.armorRating,notes:item.system.notes})),tab:this._activeTab,tabs:["overview","skills","combat","inventory","talents","progression","psionics"].map(key=>({key,title:key[0].toUpperCase()+key.slice(1),active:key===this._activeTab})),
 attributes:Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>({key,name,base:s.attributes[key].base,misc:s.attributes[key].misc,total:d.attributes[key]})),
 skills:Object.entries(SKILL_ATTRIBUTES).map(([key,attribute])=>({key,name:label(key),attribute:ATTRIBUTE_LABELS[attribute],ranks:s.skills[key].ranks,misc:s.skills[key].misc,total:d.skillTotals[key],focus:s.skills[key].focus,max:d.limits[key],over:Number(s.skills[key].ranks)>d.limits[key]})),
 prowess:Object.entries(PROWESS_LABELS).map(([key,name])=>({key,name,ranks:s.prowess[key].ranks,focus:s.prowess[key].focus,max:d.prowessLimits[key],over:Number(s.prowess[key].ranks)>d.prowessLimits[key]}))};}
 static async toggleEquipped(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item || !["weapon","armor","gear"].includes(item.type))return;await item.update({"system.equipped":!Boolean(item.system.equipped)});await this.render();}
 static async createEquipment(event,target){if(!this.isEditable)return;const type=target.dataset.itemType;if(!["weapon","armor","gear"].includes(type))return;await this.document.createEmbeddedDocuments("Item",[{name:type==="weapon"?"New Weapon":type==="armor"?"New Armor":"New Gear",type,system:{}}]);await this.render();}
 static async saveEquipment(event,target){if(!this.isEditable)return;const row=target.closest("[data-equipment-id]");if(!row)return;const item=this.document.items.get(row.dataset.equipmentId);if(!item || !["weapon","armor","gear"].includes(item.type))return;
 const allowed={weapon:["quantity","weight","cost","tier","weaponClass","hands","damage","accuracy","rateOfFire","range","shots","currentShots","ammunition","powerRating","specialTraits","notes"],armor:["quantity","weight","cost","tier","armorResistance","armorDefensePenalty","armorType","armorRating","specialTraits","notes"],gear:["quantity","weight","cost","tier","specialTraits","notes"]}[item.type];
 const numeric=new Set(["quantity","weight","cost","tier","hands","damage","accuracy","shots","currentShots","powerRating","armorResistance","armorDefensePenalty","armorRating"]);
 const update={};
 for(const input of row.querySelectorAll("[data-item-field]")){const k=input.dataset.itemField;if(!allowed.includes(k))continue;const value=numeric.has(k)?Number(input.value):input.value;if(numeric.has(k)&&!Number.isFinite(value)){ui.notifications.warn("Invalid number in "+k);return;}update["system."+k]=value;}
 await item.update(update);ui.notifications.info(item.name+" statistics saved.");await this.render();}
 static async removeEquipment(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item || !["weapon","armor","gear"].includes(item.type))return;const ok=await foundry.applications.api.DialogV2.confirm({window:{title:"Delete Equipment"},content:"Permanently delete "+foundry.utils.escapeHTML(item.name)+" from this character?"});if(!ok)return;await item.delete();await this.render();}
 static async attackWeapon(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);
  if(!item||item.type!=="weapon"||!item.system.equipped)return;
  const a=weaponAttack(this.document.system,item);
  if(!a.supported){ui.notifications.warn("This weapon firing mode is not yet automated.");return;}
  if(!a.canFire){ui.notifications.warn("Not enough ammunition for a standard attack. Reload or change weapons.");return;}
  const roll=await new Roll("1d20 + @bonus",{bonus:a.accuracy}).evaluate();
  if(a.requiresAmmo)await item.update({"system.currentShots":a.ammo-a.ammoNeeded});
  const safe=foundry.utils.escapeHTML(item.name);
  await roll.toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:safe+" — standard "+a.skill+" attack ("+a.strikes+" strikes; base damage "+a.damage+"; ammo used "+a.ammoNeeded+"). Damage and special traits require manual resolution."});
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
 static async onFormSubmit(event,form,formData){await this.document.update(formData.object);}
 static async rollSkill(event,target){const k=target.dataset.skill,d=calculateTerran(this.document.system);if(!(k in d.skillTotals))return;await new Roll(`1d20 + ${d.skillTotals[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${label(k)} check`});}
 static async rollAttribute(event,target){const k=target.dataset.attribute,d=calculateTerran(this.document.system);if(!(k in d.attributes))return;await new Roll(`1d20 + ${d.attributes[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${ATTRIBUTE_LABELS[k]} check`});}
}

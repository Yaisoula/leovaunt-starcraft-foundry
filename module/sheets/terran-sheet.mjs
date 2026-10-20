import {weaponAttack} from "../rules/weapon-attacks.mjs";
import {calculateTerran,ATTRIBUTE_LABELS,SKILL_ATTRIBUTES,PROWESS_LABELS,label} from "../rules/terran.mjs";
export class TerranSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud"],position:{width:1000,height:760},window:{resizable:true,title:"Terran Personnel HUD"},form:{submitOnChange:true,closeOnSubmit:false,handler:TerranSheet.onFormSubmit},actions:{rollSkill:TerranSheet.rollSkill,rollAttribute:TerranSheet.rollAttribute,changeTab:TerranSheet.changeTab,toggleEquipped:TerranSheet.toggleEquipped,createEquipment:TerranSheet.createEquipment,saveEquipment:TerranSheet.saveEquipment,removeEquipment:TerranSheet.removeEquipment,toggleEquipmentDetails:TerranSheet.toggleEquipmentDetails,editEquipment:TerranSheet.editEquipment,toggleEquipmentMenu:TerranSheet.toggleEquipmentMenu,attackWeapon:TerranSheet.attackWeapon,reloadWeapon:TerranSheet.reloadWeapon,saveQuantity:TerranSheet.saveQuantity,chooseItemImage:TerranSheet.chooseItemImage}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/terran-sheet.hbs"}};
 _activeTab="overview";
 _expandedEquipment=new Set();
 _editingEquipment=new Set();
 _menuEquipment=null;
 static async changeTab(event,target){const next=target.dataset.tab;if(!["overview","skills","combat","inventory","talents","progression","psionics","bio"].includes(next))return;this._activeTab=next;await this.render();}
 async _prepareContext(options){const context=await super._prepareContext(options),actor=this.document,s=actor.system,d=calculateTerran(s,actor.items);
 const powerLevels=[{key:"heroic",name:"Heroic",starting:25,perLevel:4,hp:40},{key:"advanced",name:"Advanced Heroic",starting:32,perLevel:5,hp:40},{key:"epic",name:"Epic Heroic",starting:40,perLevel:6,hp:40}];
 return {...context,actor,s,derived:d,powerLevels:powerLevels.map(t=>({...t,selected:s.powerLevel===t.key})),selectedPower:powerLevels.find(t=>t.key===s.powerLevel)||powerLevels[0],combatWeapons:actor.items.filter(item=>item.type==="weapon"&&item.system.equipped).map(item=>({id:item.id,name:item.name,range:item.system.range,rate:item.system.rateOfFire,attack:weaponAttack(s,item)})),inventory:actor.items.filter(item=>["weapon","armor","gear"].includes(item.type)).map(item=>({id:item.id,name:item.name,type:item.type,equipped:Boolean(item.system.equipped),quantity:item.system.quantity,weight:item.system.weight,cost:item.system.cost,tier:item.system.tier,weaponClass:item.system.weaponClass,hands:item.system.hands,damage:item.system.damage,accuracy:item.system.accuracy,rateOfFire:item.system.rateOfFire,range:item.system.range,shots:item.system.shots,currentShots:item.system.currentShots,ammunition:item.system.ammunition,powerRating:item.system.powerRating,specialTraits:item.system.specialTraits,armorResistance:item.system.armorResistance,armorDefensePenalty:item.system.armorDefensePenalty,armorType:item.system.armorType,armorRating:item.system.armorRating,notes:item.system.notes,img:item.img,expanded:this._expandedEquipment.has(item.id),editing:this._editingEquipment.has(item.id),menuOpen:this._menuEquipment===item.id})),tab:this._activeTab,tabs:["overview","skills","combat","inventory","talents","progression","psionics","bio"].map(key=>({key,title:key[0].toUpperCase()+key.slice(1),active:key===this._activeTab})),
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
 static async toggleEquipmentDetails(event,target){const id=target.dataset.itemId;if(!this.document.items.has(id))return;if(this._expandedEquipment.has(id)){this._expandedEquipment.delete(id);this._editingEquipment.delete(id);}else{this._expandedEquipment.add(id);}this._menuEquipment=null;await this.render();}
 static async editEquipment(event,target){if(!this.isEditable)return;const id=target.dataset.itemId;if(!this.document.items.has(id))return;this._expandedEquipment.add(id);this._editingEquipment.add(id);this._menuEquipment=null;await this.render();}
 static async toggleEquipmentMenu(event,target){const id=target.dataset.itemId;if(!this.document.items.has(id))return;this._menuEquipment=this._menuEquipment===id?null:id;await this.render();}
 async _onRender(context,options){await super._onRender(context,options);const root=this.element;root?.querySelectorAll("[data-equipment-id]").forEach(row=>{row.addEventListener("contextmenu",event=>{if(event.target.closest("input,select,textarea"))return;event.preventDefault();this._menuEquipment=row.dataset.equipmentId;this.render();});});}
 static async saveQuantity(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item||!["weapon","armor","gear"].includes(item.type))return;const input=target.closest(".hud-item-quantity")?.querySelector("input");const value=Number(input?.value);if(!Number.isSafeInteger(value)||value<0){ui.notifications.warn("Quantity must be a whole number of 0 or more.");return;}if(value!==item.system.quantity)await item.update({"system.quantity":value});}
 static async chooseItemImage(event,target){if(!this.isEditable)return;const item=this.document.items.get(target.dataset.itemId);if(!item||!["weapon","armor","gear"].includes(item.type))return;const Picker=foundry.applications.apps.FilePicker;const picker=new Picker({type:"image",current:item.img,callback:async path=>{await item.update({img:path});await this.render();}});picker.render(true);}
 static async onFormSubmit(event,form,formData){await this.document.update(formData.object);}
 static async rollSkill(event,target){const k=target.dataset.skill,d=calculateTerran(this.document.system);if(!(k in d.skillTotals))return;await new Roll(`1d20 + ${d.skillTotals[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${label(k)} check`});}
 static async rollAttribute(event,target){const k=target.dataset.attribute,d=calculateTerran(this.document.system);if(!(k in d.attributes))return;await new Roll(`1d20 + ${d.attributes[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${ATTRIBUTE_LABELS[k]} check`});}
}

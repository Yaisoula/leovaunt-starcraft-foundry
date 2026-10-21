import {adjustMorale,applyWoundMorale} from "../rules/morale.mjs";
import {setWoundPoints,setBleedValue} from "../rules/wounds.mjs";
import {grabAthletics,grabToughness,grabState,startGrab,endGrab} from "../rules/grab.mjs";
import {setProneStatus} from "../rules/wounds.mjs";
import {disarmAttackBonus,disarmTargetToughness,disarmResult,pushResult} from "../rules/disarm.mjs";
import {chargeAttackModifiers,chargingState,setChargingDefense} from "../rules/charging.mjs";
import {permanentWoundState,applyWoundThreshold,gmSetDeceased,gmUpdatePermanentInjury,setPermanentInjuryNotes} from "../rules/wounds.mjs";
import {LOCATIONS,WOUND_RULES,woundState,recordWounds,gmSetWoundPoints,woundConditions,applyImmediateWoundEffect,gmSetWoundCondition,applyBleedTick,droppableOneHandedItems,dropHeldItem} from "../rules/wounds.mjs";
import {targetProfile,previewPhysicalDamage} from "../rules/targeting.mjs";
import {resolvePhysicalDamage,resolveAttackDamage,parsePhysicalTraits} from "../rules/damage.mjs";
import {weaponAttack,resolveWeaponDamage,firingModes,selectedFiringMode,isJamEligible,naturalAttackTotal} from "../rules/weapon-attacks.mjs";
import {calculateTerran,ATTRIBUTE_LABELS,SKILL_ATTRIBUTES,PROWESS_LABELS,label} from "../rules/terran.mjs";
export class TerranSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud"],position:{width:1000,height:760},window:{resizable:true,title:"Terran Personnel HUD"},form:{submitOnChange:true,closeOnSubmit:false,handler:TerranSheet.onFormSubmit},actions:{adjustMorale:TerranSheet.adjustMorale,rollSkill:TerranSheet.rollSkill,rollProwess:TerranSheet.rollProwess,rollAttribute:TerranSheet.rollAttribute,changeTab:TerranSheet.changeTab,toggleEquipped:TerranSheet.toggleEquipped,createEquipment:TerranSheet.createEquipment,saveEquipment:TerranSheet.saveEquipment,removeEquipment:TerranSheet.removeEquipment,toggleEquipmentDetails:TerranSheet.toggleEquipmentDetails,editEquipment:TerranSheet.editEquipment,toggleEquipmentMenu:TerranSheet.toggleEquipmentMenu,attackWeapon:TerranSheet.attackWeapon,disarmWeapon:TerranSheet.disarmWeapon,pushTarget:TerranSheet.pushTarget,knockDownTarget:TerranSheet.knockDownTarget,grabTarget:TerranSheet.grabTarget,releaseGrab:TerranSheet.releaseGrab,toggleChargingDefense:TerranSheet.toggleChargingDefense,reloadWeapon:TerranSheet.reloadWeapon,unjamWeapon:TerranSheet.unjamWeapon,chooseItemImage:TerranSheet.chooseItemImage,applyPhysicalDamage:TerranSheet.applyPhysicalDamage,resolveWounds:TerranSheet.resolveWounds,describeWound:TerranSheet.describeWound,adjustWound:TerranSheet.adjustWound,saveBleed:TerranSheet.saveBleed,applyBleedTick:TerranSheet.applyBleedTick,setWoundCondition:TerranSheet.setWoundCondition,setDeceased:TerranSheet.setDeceased,editPermanentInjury:TerranSheet.editPermanentInjury,removePermanentInjury:TerranSheet.removePermanentInjury}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/terran-sheet.hbs"}};
 _activeTab="overview";
 _damageDraft={damage:0,penetration:0,rending:0};
 _expandedEquipment=new Set();
 _editingEquipment=new Set();
 _menuEquipment=null;
 _firingModeSelections=new Map();
 _savedScrollPositions=new Map();
 static async changeTab(event,target){const next=target.dataset.tab;if(!["overview","combat","inventory","talents","progression","psionics","bio"].includes(next))return;this._activeTab=next;await this.render();}
 _inventoryEntry(item){return {id:item.id,name:item.name,type:item.type,equipped:Boolean(item.system.equipped),quantity:item.system.quantity,weight:item.system.weight,cost:item.system.cost,tier:item.system.tier,weaponClass:item.system.weaponClass,hands:item.system.hands,damage:item.system.damage,accuracy:item.system.accuracy,rateOfFire:item.system.rateOfFire,range:item.system.range,shots:item.system.shots,currentShots:item.system.currentShots,ammunition:item.system.ammunition,powerRating:item.system.powerRating,specialTraits:item.system.specialTraits,armorResistance:item.system.armorResistance,armorDefensePenalty:item.system.armorDefensePenalty,armorType:item.system.armorType,armorRating:item.system.armorRating,notes:item.system.notes,img:item.img,expanded:this._expandedEquipment.has(item.id),editing:this._editingEquipment.has(item.id),menuOpen:this._menuEquipment===item.id};}
 async _prepareContext(options){const context=await super._prepareContext(options),actor=this.document,s=actor.system,d=calculateTerran(s,actor.items,woundState(actor).points);
 const powerLevels=[{key:"heroic",name:"Heroic",starting:25,perLevel:4,hp:40},{key:"advanced",name:"Advanced Heroic",starting:32,perLevel:5,hp:40},{key:"epic",name:"Epic Heroic",starting:40,perLevel:6,hp:40}];
 return {...context,actor,s,derived:d,grabInfo:grabState(actor),damageDraft:this._damageDraft,powerLevels:powerLevels.map(t=>({...t,selected:s.powerLevel===t.key})),selectedPower:powerLevels.find(t=>t.key===s.powerLevel)||powerLevels[0],woundRows:LOCATIONS.map(key=>({key,label:key[0].toUpperCase()+key.slice(1),points:woundState(this.document).points?.[key]??0,immediate:WOUND_RULES[key].immediate,ongoing:WOUND_RULES[key].ongoing})),woundHistory:[...(woundState(this.document).history??[])].reverse().slice(0,15),permanentWounds:permanentWoundState(this.document),permanentInjuryNotes:this.document.getFlag("leovaunt-starcraft","permanentInjuryNotes")??"",chargingDefense:chargingState(this.document),isGM:game.user.isGM,woundConditions:woundConditions(this.document),combatWeapons:actor.items.filter(item=>item.type==="weapon"&&item.system.equipped).map(item=>({id:item.id,name:item.name,range:item.system.range,rate:item.system.rateOfFire,jammed:Boolean(item.system.jammed),attack:weaponAttack(s,item,woundState(actor).points),modes:firingModes(weaponAttack(s,item,woundState(actor).points))})),inventory:actor.items.filter(item=>["weapon","armor","gear"].includes(item.type)).map(item=>({id:item.id,name:item.name,type:item.type,equipped:Boolean(item.system.equipped),quantity:item.system.quantity,weight:item.system.weight,cost:item.system.cost,tier:item.system.tier,weaponClass:item.system.weaponClass,hands:item.system.hands,damage:item.system.damage,accuracy:item.system.accuracy,rateOfFire:item.system.rateOfFire,range:item.system.range,shots:item.system.shots,currentShots:item.system.currentShots,ammunition:item.system.ammunition,powerRating:item.system.powerRating,specialTraits:item.system.specialTraits,armorResistance:item.system.armorResistance,armorDefensePenalty:item.system.armorDefensePenalty,armorType:item.system.armorType,armorRating:item.system.armorRating,notes:item.system.notes,img:item.img,expanded:this._expandedEquipment.has(item.id),editing:this._editingEquipment.has(item.id),menuOpen:this._menuEquipment===item.id})),inventoryWeapons:actor.items.filter(item=>item.type==="weapon").map(item=>this._inventoryEntry(item)),inventoryArmor:actor.items.filter(item=>item.type==="armor").map(item=>this._inventoryEntry(item)),inventoryGear:actor.items.filter(item=>item.type==="gear").map(item=>this._inventoryEntry(item)),tab:this._activeTab,tabs:["overview","combat","inventory","talents","psionics","bio","progression"].map(key=>({key,title:key[0].toUpperCase()+key.slice(1),active:key===this._activeTab})),
 attributes:Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>({key,name,base:s.attributes[key].base,misc:s.attributes[key].misc,total:d.attributes[key],over:d.attributes[key]>d.attributeMax})),
 skills:Object.entries(SKILL_ATTRIBUTES).map(([key,attribute])=>({key,name:label(key),attribute:ATTRIBUTE_LABELS[attribute],ranks:s.skills[key].ranks,misc:s.skills[key].misc,total:d.skillTotals[key],focus:s.skills[key].focus,max:d.limits[key],over:Number(s.skills[key].ranks)>d.limits[key]})),
 skillColumns:[0,1].map(column=>Object.entries(SKILL_ATTRIBUTES).slice(column*8,(column+1)*8).map(([key,attribute])=>({key,name:label(key),attribute:ATTRIBUTE_LABELS[attribute],ranks:s.skills[key].ranks,misc:s.skills[key].misc,total:d.skillTotals[key],focus:s.skills[key].focus,max:d.limits[key],over:Number(s.skills[key].ranks)>d.limits[key]}))),
 prowess:Object.entries(PROWESS_LABELS).map(([key,name])=>({key,name,ranks:s.prowess[key].ranks,focus:s.prowess[key].focus,total:d.prowess[key],max:d.prowessLimits[key],over:Number(s.prowess[key].ranks)>d.prowessLimits[key]}))};}
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
  if(item.system.jammed){ui.notifications.warn("Weapon is jammed. Use Clear Jam first.");return;}
  const a=weaponAttack(this.document.system,item,woundState(this.document).points);
  const container=target.closest(".hud-combat-weapon");
  let mode;
  try{mode=selectedFiringMode(a,container?.querySelector("[data-firing-mode]")?.value||"normal");}
  catch(error){ui.notifications.warn(error.message);return;}
  if(!mode.canFire){ui.notifications.warn("Not enough ammunition for "+mode.label+" ("+mode.ammo+" rounds required).");return;}
  const selected=Array.from(game.user.targets);
  const profiles=selected.map(token=>targetProfile(token.actor)).filter(Boolean);
  if(selected.length!==profiles.length){ui.notifications.warn("Some targets cannot be resolved automatically.");return;}
  if(!mode.burst&&!mode.cone&&selected.length>1){ui.notifications.warn("This firing mode targets one creature. Select one target.");return;}
  const charge=mode.id==="normal"&&container?.querySelector("[data-charge]")?.checked===true;
  const actionMove=!charge&&container?.querySelector("[data-action-move]")?.checked===true;
  const chargeMods=charge?chargeAttackModifiers(a):null;
  if(charge)await setChargingDefense(this.document,true);
  const accuracy=mode.accuracy+(chargeMods?chargeMods.accuracy-a.accuracy:0)-(actionMove?2:0);
  const formula=mode.advantage?"2d20kh + @bonus":"1d20 + @bonus";
  const roll=await new Roll(formula,{bonus:accuracy}).evaluate();
  if(a.requiresAmmo)await item.update({"system.currentShots":a.ammo-mode.ammo});
  const natural=roll.dice?.[0]?.results?.filter(d=>d.active).map(d=>d.result)??[];
  const natural20=natural.includes(20),natural1=natural.length>0&&natural.every(v=>v===1);
  const jammed=natural1&&isJamEligible(item,a);
  if(jammed)await item.update({"system.jammed":true});
  const esc=foundry.utils.escapeHTML,traits=parsePhysicalTraits(item.system.specialTraits);
  const dieResults=roll.dice?.[0]?.results?.map(d=>d.result)??[];
  const shownDice=dieResults.length?dieResults.join(" / "):"—";
  const shownTotal=roll.total;
  const effectiveTotal=natural20?30+accuracy:natural1?-10+accuracy:shownTotal;
  const targets=profiles.length?profiles.map(p=>({name:p.actor.name,defense:Number(p.defense),profile:p})):[];
  const applications=[];
  const allMissed=natural1||(targets.length>0&&targets.every(t=>!resolveWeaponDamage(a,effectiveTotal,t.defense).hit));
  const rollTone=allMissed?"miss":natural20?"crit":"normal";
  const formatSigned=n=>n>=0?"+"+n:String(n);
  const baseDisplayDamage=allMissed?0:targets.length?Math.max(0,...targets.map(t=>{
   const result=resolveWeaponDamage(a,effectiveTotal,t.defense);
   if(!result.hit)return mode.burst||mode.cone?Math.floor(a.damage/2):0;
   return mode.burst||mode.cone?a.damage:result.damage;
  })):a.damage;
  const damageTone=allMissed?"miss":natural20?"crit":"normal";
  const baseAccuracy=accuracy-(charge?5:0)+(actionMove?2:0);
  const rollParts=[esc(shownDice),formatSigned(baseAccuracy)];
  if(charge)rollParts.push("+ 5");
  if(actionMove)rollParts.push("− 2");
  if(natural20)rollParts.push("+ 10");
  const diceBreakdown=rollParts.join(" ");
  let breakdown='<div class="sc-attack-details"><strong>'+esc(item.name)+' — '+esc(mode.label)+'</strong>'+
   '<div class="sc-roll-card sc-roll-card--'+rollTone+'"><div class="sc-roll-card-label">'+(charge?'ATTACK - CHARGE':actionMove?'ATTACK - ACTION MOVE':'ATTACK')+'</div><div class="sc-roll-card-total">'+(natural1?'Automatic Miss':effectiveTotal)+'</div><div class="sc-roll-card-breakdown">'+diceBreakdown+'</div></div>'+
   '<div class="sc-roll-card sc-roll-card--damage sc-roll-card--'+damageTone+'"><div class="sc-roll-card-label">DAMAGE</div><div class="sc-roll-card-total">'+baseDisplayDamage+'</div></div>'+
   (jammed?'<div class="sc-roll-card sc-roll-card--jam">GUN JAMMED!</div>':'')+
   '<p class="sc-ammo-used">Ammunition used: '+mode.ammo+'</p></div>';
  let gmDetails='<div class="sc-gm-damage">';
  for(const t of targets){
   const attackTotal=natural20?30+accuracy:natural1?-10+accuracy:roll.total;
   const outcome=resolveWeaponDamage(a,attackTotal,t.defense);
   if(natural1)outcome.hit=false;
   const hit=outcome.hit;
   const area=!!(mode.burst||mode.cone);
   const damage=hit?(area?a.damage:outcome.damage):((area&&!mode.suppress)?Math.floor(a.damage/2):0);
   const hailfire=(hit?mode.hailfire:(area&&!mode.suppress&&mode.hailfire>=2?Math.floor(mode.hailfire/2):0))+traits.hailfire;
   if(damage<=0)continue;
   if(!hailfire&&!area&&!mode.suppress)this._damageDraft={damage,penetration:traits.penetration,rending:traits.rending};
   if(!traits.hasUnsupportedEffects){
    const index=applications.length;
    applications.push({uuid:t.profile.actor.uuid,type:t.profile.actor.type,damage,penetration:traits.penetration,rending:traits.rending,hailfire,damageType:traits.damageType,targetIsConstruct:t.profile.targetIsConstruct,individualWounds:area||hailfire>0,suppress:Boolean(mode.suppress)});
    gmDetails+='<button type="button" data-sc-apply-damage="'+index+'">Apply Damage — '+esc(t.name)+'</button>';
   }
  }
  gmDetails+='</div>';
  if(traits.hasUnsupportedEffects)ui.notifications.warn("Some weapon traits require manual resolution.");
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],content:breakdown});
  if(targets.length){
   const gmRecipients=ChatMessage.getWhisperRecipients("GM");
   if(gmRecipients.length){
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),whisper:gmRecipients.map(u=>u.id),content:gmDetails,flags:{"leovaunt-starcraft":{damageApplications:applications,appliedDamage:[]}}});
   }else ui.notifications.warn("No GM is available to receive the private damage application message.");
  }
  await this.render();
 }
 static async unjamWeapon(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);
  if(!item||item.type!=="weapon"||!item.system.equipped||!item.system.jammed)return;
  await item.update({"system.jammed":false});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),content:"<strong>"+foundry.utils.escapeHTML(this.document.name)+"</strong> unjams their "+foundry.utils.escapeHTML(item.name)+". <small>(Standard action)</small>"});
  ui.notifications.info(item.name+" unjammed. Clearing a jam costs a standard action; track the action manually.");
  await this.render();
 }
 static async reloadWeapon(event,target){
  if(!this.isEditable)return;
  const item=this.document.items.get(target.dataset.itemId);
  if(!item||item.type!=="weapon"||!item.system.equipped)return;
  const capacity=Math.max(0,Number(item.system.shots)||0);
  if(!capacity){ui.notifications.warn("This weapon has no configured magazine.");return;}
  await item.update({"system.currentShots":capacity});
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),content:"<strong>"+foundry.utils.escapeHTML(this.document.name)+"</strong> reloads their "+foundry.utils.escapeHTML(item.name)+"."});
  ui.notifications.info("Magazine reset to full. Reserve ammunition and reload actions are not yet tracked.");
  await this.render();
 }
 static async toggleEquipmentDetails(event,target){const id=target.dataset.itemId;if(!this.document.items.has(id))return;if(this._expandedEquipment.has(id)){this._expandedEquipment.delete(id);this._editingEquipment.delete(id);}else{this._expandedEquipment.add(id);}this._menuEquipment=null;await this.render();}
 static async editEquipment(event,target){if(!this.isEditable)return;const id=target.dataset.itemId;if(!this.document.items.has(id))return;this._expandedEquipment.add(id);this._editingEquipment.add(id);this._menuEquipment=null;await this.render();}
 static async toggleEquipmentMenu(event,target){const id=target.dataset.itemId;if(!this.document.items.has(id))return;this._menuEquipment=this._menuEquipment===id?null:id;await this.render();}
 async render(options={}){
  // Keep the reader's scroll position during Foundry's automatic form and actor updates.
  const root=this.element;
  const tracked=root?[root.closest(".window-content"),root,...root.querySelectorAll(".window-content,.hud-shell,.hud-body,.hud-content,.hud-tab-content,.tab-content")].filter(Boolean):[];
  const positions=tracked.map((node,index)=>({index,top:node.scrollTop,left:node.scrollLeft}));
  if(root){for(const row of root.querySelectorAll(".hud-combat-weapon[data-item-id]")){const select=row.querySelector("[data-firing-mode]");if(select)this._firingModeSelections.set(row.dataset.itemId,select.value);}}
  if(positions.length)this._savedScrollPositions.set(this._activeTab,positions);
  const result=await super.render(options);
  const next=this.element;
  if(next&&positions.length){
   const targets=[next.closest(".window-content"),next,...next.querySelectorAll(".window-content,.hud-shell,.hud-body,.hud-content,.hud-tab-content,.tab-content")].filter(Boolean);
   for(const {index,top,left} of positions){const node=targets[index];if(node){node.scrollTop=top;node.scrollLeft=left;}}
  }
  return result;
 }
 async _onRender(context,options){await super._onRender(context,options);const root=this.element;root?.querySelector("[data-injury-notes]")?.addEventListener("change",async event=>{if(!this.isEditable)return;try{await setPermanentInjuryNotes(this.document,event.target.value);}catch(error){ui.notifications.error(error.message);}});root?.querySelector("[data-player-bleed]")?.addEventListener("change",async event=>{if(!this.isEditable)return;try{const result=await setBleedValue(this.document,event.target.value);await this.render();}catch(error){ui.notifications.error(error.message);}});root?.querySelectorAll("[data-wound-points]").forEach(input=>input.addEventListener("change",async()=>{if(!this.isEditable)return;const location=input.dataset.woundPoints;try{const result=await setWoundPoints(this.document,location,input.value);await this.render();}catch(error){ui.notifications.error(error.message);}}));root?.querySelectorAll(".hud-combat-weapon").forEach(row=>{const select=row.querySelector("[data-firing-mode]");const id=row.dataset.itemId;const saved=this._firingModeSelections.get(id);if(select){if(saved&&Array.from(select.options).some(option=>option.value===saved))select.value=saved;else this._firingModeSelections.set(id,select.value);select.addEventListener("change",()=>this._firingModeSelections.set(id,select.value));}});root?.querySelectorAll(".hud-combat-weapon").forEach(row=>{const chargeBox=row.querySelector("[data-charge]"),moveBox=row.querySelector("[data-action-move]");const updatePreview=()=>{const charge=chargeBox?.checked===true,move=moveBox?.checked===true;const accuracy=Number(row.dataset.baseAccuracy)||0,damage=Number(row.dataset.baseDamage)||0;const a=row.querySelector("[data-preview-accuracy]"),d=row.querySelector("[data-preview-damage]");if(a)a.textContent=String(accuracy+(charge?5:move?-2:0));if(d)d.textContent=String(damage+(charge&&row.dataset.melee==="true"?10:0));};for(const box of [chargeBox,moveBox])box?.addEventListener("change",()=>{if(box.checked){const other=box===chargeBox?moveBox:chargeBox;if(other)other.checked=false;}updatePreview();});updatePreview();});root?.querySelectorAll("[data-quantity-item-id]").forEach(input=>{input.addEventListener("change",event=>this.saveQuantity(event,input));});const savedScroll=this._savedScrollPositions.get(this._activeTab);if(root&&savedScroll){const nodes=[root.closest(".window-content"),root,...root.querySelectorAll(".window-content,.hud-shell,.hud-body,.hud-content,.hud-tab-content,.tab-content")].filter(Boolean);const restore=()=>{for(const {index,top,left} of savedScroll){const node=nodes[index];if(node){node.scrollTop=top;node.scrollLeft=left;}}};restore();requestAnimationFrame(()=>{if(this.element===root)restore();requestAnimationFrame(()=>{if(this.element===root)restore();});});}}
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
 static async rollProwess(event,target){const k=target.dataset.prowess,d=calculateTerran(this.document.system,this.document.items,woundState(this.document).points);if(!(k in d.prowess))return;await new Roll(`1d20 + ${d.prowess[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${PROWESS_LABELS[k]} check`});}
 static async rollAttribute(event,target){const k=target.dataset.attribute,d=calculateTerran(this.document.system);if(!(k in d.attributes))return;await new Roll(`1d20 + ${d.attributes[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${ATTRIBUTE_LABELS[k]} check`});}
 static async describeWound(event,target){
  const location=target.dataset.location;
  const rules=location==="bleed"?null:WOUND_RULES[location];
  if(!rules&&location!=="bleed")return;
  const actor=this.document,esc=foundry.utils.escapeHTML;
  const content=location==="bleed"
   ?"<strong>Bleed</strong><p>Take damage equal to your current Bleed at the start of each turn. Bleed stacks and ignores Damage Resistance. Bleed ends at 0 HP or with First Aid.</p>"
   :"<strong>"+esc(location[0].toUpperCase()+location.slice(1))+" Wounds</strong><p>Immediate (per wound): "+esc(rules.immediate)+"</p><p>Ongoing (per wound point): "+esc(rules.ongoing)+"</p>"+(["mobility","action"].includes(location)?"<p>At 5+ points, each new maiming injury adds 20 Bleed and destroys a limb (GM adjudicates).</p>":"");
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content});
 }
 static async resolveWounds(){
  if(!this.isEditable)return;const actor=this.document,count=Number(actor.system.resources.woundsPending||0);
  if(!Number.isSafeInteger(count)||count<=0){ui.notifications.warn("No pending wounds.");return;}
  const result=await recordWounds(actor,{count,source:"Pending physical damage"});
  await applyWoundMorale(actor);
  await actor.update({"system.resources.woundsPending":0});
  const immediate=await applyImmediateWoundEffect(actor,result.location,count);
  const threshold=await applyWoundThreshold(actor,result);
  if(threshold.added){const before=woundConditions(actor).bleed;await setBleedValue(actor,before+20*threshold.added);ui.notifications.info("Maiming added "+20*threshold.added+" Bleed.");}
  if(threshold.added)ui.notifications.warn(threshold.added+" permanent maiming injury record(s) created; GM must describe affected anatomy.");
  if(threshold.deceased)ui.notifications.error(actor.name+" has reached a lethal wound threshold and is marked deceased.");
  if(immediate.dropItem)await this.chooseDroppedItem(actor);
  const rule=WOUND_RULES[result.location];await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:"<strong>"+foundry.utils.escapeHTML(actor.name)+"</strong>: "+count+" wound point(s) to "+result.location+" ("+(result.rolls[0]?.total??"GM")+")<p>Immediate: "+rule.immediate+"</p><p>Ongoing: "+rule.ongoing+"</p>"+(result.dead?"<strong>Death/destruction threshold reached — GM review required.</strong>":result.maimed?"<strong>Maiming threshold reached — GM review required.</strong>":"")});
  await this.render();
 }
 static async adjustWound(event,target){
  if(!this.isEditable)return;
  const location=target.dataset.location;
  const field=this.element.querySelector('[data-wound-points="'+location+'"]');
  try{
   const result=await setWoundPoints(this.document,location,field?.value);
 
   await this.render();
  }catch(error){ui.notifications.error(error.message);}
 }
 static async saveBleed(){
  if(!this.isEditable)return;
  const field=this.element.querySelector("[data-player-bleed]");
  try{
   const result=await setBleedValue(this.document,field?.value);
   
   await this.render();
  }catch(error){ui.notifications.error(error.message);}
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
  try{const before=woundConditions(this.document)[key];await gmSetWoundCondition(this.document,key,key==="prone"?field?.checked:field?.value);const after=woundConditions(this.document)[key];if(before!==after)await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),content:foundry.utils.escapeHTML(this.document.name)+" — "+foundry.utils.escapeHTML(key)+" changed: "+before+" → "+after+" (GM)."});await this.render();}catch(err){ui.notifications.error(err.message);}
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

 static async disarmWeapon(event,target){
  if(!this.isEditable)return;
  let item=this.document.items.get(target.dataset.itemId);
  if(!item){const weapons=this.document.items.filter(i=>i.type==="weapon"&&i.system.equipped);if(!weapons.length){ui.notifications.warn("Equip a weapon before using Disarm.");return;}if(weapons.length===1)item=weapons[0];else{const esc=foundry.utils.escapeHTML;const choice=await foundry.applications.api.DialogV2.prompt({window:{title:"Select Disarm Weapon"},content:'<label>Weapon<select name="weapon">'+weapons.map(w=>'<option value="'+esc(w.id)+'">'+esc(w.name)+'</option>').join("")+'</select></label>',ok:{label:"Continue",callback:(event,button)=>button.form.elements.weapon.value},rejectClose:false});if(!choice)return;item=this.document.items.get(choice);}}
  
  if(!item||item.type!=="weapon"||!item.system.equipped)return;
  const selected=Array.from(game.user.targets);
  if(selected.length>1){ui.notifications.warn("Target only one creature for Disarm.");return;}
  const victim=selected[0]?.actor??null;
  const toughness=disarmTargetToughness(victim);
  const attack=disarmAttackBonus(this.document,item);
  const esc=foundry.utils.escapeHTML;
  const chosen=await foundry.applications.api.DialogV2.prompt({
   window:{title:"Disarm — "+item.name},
   content:'<p>Disarm is a standard action. Roll special attack against target Toughness plus the bonus for the item being held. No damage is dealt.</p>'+
    '<label>Target Toughness <input type="number" name="toughness" min="0" step="1" value="'+(toughness??"")+'" required/></label>'+
    '<label>Target item <select name="targetHands"><option value="1">One-handed (+2 Toughness)</option><option value="2">Two-handed (+5 Toughness)</option></select></label>'+
    '<label>Additional attack modifier (size / situational) <input type="number" name="extra" step="1" value="0"/></label>'+
    '<p>Your special attack bonus: '+attack.base+' + '+attack.handBonus+' (weapon) = '+attack.total+'. NPC size is not yet stored; add it above if needed.</p>',
   ok:{label:"Roll Disarm",callback:(event,button)=>{const f=button.form;return {toughness:f.elements.toughness.value,targetHands:f.elements.targetHands.value,extra:f.elements.extra.value};}},
   rejectClose:false
  });
  if(!chosen)return;
  const tough=Number(chosen.toughness),extra=Number(chosen.extra);
  if(chosen.toughness===""||!Number.isFinite(tough)||tough<0||!Number.isFinite(extra)){ui.notifications.warn("Enter valid Toughness and modifier values.");return;}
  const roll=await new Roll("1d20 + @bonus",{bonus:attack.total+extra}).evaluate();
  const result=disarmResult(roll.total,tough,chosen.targetHands);
  const name=victim?.name??"Manual target";
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],flavor:esc(this.document.name)+" — Disarm ("+esc(item.name)+")",content:'<div class="sc-attack-details"><strong>'+(result.success?"SUCCESS":"FAILURE")+'</strong> — Disarm vs '+esc(name)+'<p>Special attack: '+roll.total+' vs Toughness '+result.dc+' (base '+tough+', held item +'+(Number(chosen.targetHands)===2?5:2)+')</p><p>'+(result.success?"No damage. The target drops the item at its feet. GM handles the item drop.":"Item remains held.")+'</p><small>Item selection, actual drop and unarmed grab-on-success-by-5 are not automated.</small></div>'});
 }

 static async pushTarget(event,target){
  if(!this.isEditable)return;
  const selected=Array.from(game.user.targets);
  if(selected.length>1){ui.notifications.warn("Target only one creature for Push.");return;}
  const victim=selected[0]?.actor??null;
  const toughness=disarmTargetToughness(victim);
  const esc=foundry.utils.escapeHTML;
  const attack=disarmAttackBonus(this.document,null);
  // Push uses the special attack bonus, without the disarm weapon hand bonus.
  const chosen=await foundry.applications.api.DialogV2.prompt({
   window:{title:"Push — Special Combat Action"},
   content:'<p>Push is a standard action. Roll special attack vs Toughness. It provokes an opportunity attack and can only affect a creature up to one size category larger.</p>'+
    '<label>Target Toughness <input type="number" name="toughness" min="0" step="1" value="'+(toughness??"")+'" required/></label>'+
    '<label>Additional modifier (size / situational) <input type="number" name="extra" step="1" value="0"/></label>'+
    '<p>Special attack bonus: '+attack.base+' (Melee + half Strength + size). NPC size modifier must be entered manually if applicable.</p>',
   ok:{label:"Roll Push",callback:(event,button)=>({toughness:button.form.elements.toughness.value,extra:button.form.elements.extra.value})},
   rejectClose:false
  });
  if(!chosen)return;
  const tough=Number(chosen.toughness),extra=Number(chosen.extra);
  if(chosen.toughness===""||!Number.isFinite(tough)||tough<0||!Number.isFinite(extra)){ui.notifications.warn("Enter valid Toughness and modifier values.");return;}
  const roll=await new Roll("1d20 + @bonus",{bonus:attack.base+extra}).evaluate();
  const result=pushResult(roll.total,tough);
  const name=victim?.name??"Manual target";
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],flavor:esc(this.document.name)+" — Push",content:'<div class="sc-attack-details"><strong>'+(result.success?"SUCCESS":"FAILURE")+'</strong> — Push vs '+esc(name)+'<p>Special attack: '+roll.total+' vs Toughness '+result.dc+' (margin '+result.margin+')</p><p>'+(result.success?"Push target back <strong>"+result.squares+" square"+(result.squares===1?"":"s")+"</strong>.":"Target is not pushed.")+'</p><small>Movement is GM-controlled. Push provokes an opportunity attack. Target must be no more than one size category larger.</small></div>'});
 }

 static async knockDownTarget(event,target){
  if(!this.isEditable)return;
  const selected=Array.from(game.user.targets);
  if(selected.length>1){ui.notifications.warn("Target only one creature for Knock Down.");return;}
  const victim=selected[0]?.actor??null;
  const toughness=disarmTargetToughness(victim);
  const attack=disarmAttackBonus(this.document,null);
  const esc=foundry.utils.escapeHTML;
  const chosen=await foundry.applications.api.DialogV2.prompt({
   window:{title:"Knock Down — Special Combat Action"},
   content:'<p>Knock Down is a standard action. Roll special attack vs Toughness. On success, the target becomes Prone. No damage is dealt.</p>'+
    '<label>Target Toughness <input type="number" name="toughness" min="0" step="1" value="'+(toughness??"")+'" required/></label>'+
    '<label>Additional modifier (size / situational) <input type="number" name="extra" step="1" value="0"/></label>'+
    '<p>Special attack bonus: '+attack.base+' (Melee + half Strength + size). NPC size modifier must be entered manually if applicable.</p>',
   ok:{label:"Roll Knock Down",callback:(event,button)=>({toughness:button.form.elements.toughness.value,extra:button.form.elements.extra.value})},
   rejectClose:false
  });
  if(!chosen)return;
  const tough=Number(chosen.toughness),extra=Number(chosen.extra);
  if(chosen.toughness===""||!Number.isFinite(tough)||tough<0||!Number.isFinite(extra)){ui.notifications.warn("Enter valid Toughness and modifier values.");return;}
  const roll=await new Roll("1d20 + @bonus",{bonus:attack.base+extra}).evaluate();
  const success=roll.total>=tough;
  let proneMessage="No target token was selected; GM must apply Prone manually.";
  if(success&&victim){
   try{await setProneStatus(victim,true);proneMessage="Prone applied automatically to "+esc(victim.name)+".";}
   catch(error){proneMessage="Could not apply Prone automatically ("+esc(error.message)+"). GM must apply it manually.";ui.notifications.warn("Knock Down succeeded but Prone could not be applied automatically.");}
  }
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],flavor:esc(this.document.name)+" — Knock Down",content:'<div class="sc-attack-details"><strong>'+(success?"SUCCESS":"FAILURE")+'</strong> — Knock Down vs '+esc(victim?.name??"Manual target")+'<p>Special attack: '+roll.total+' vs Toughness '+tough+'</p><p>'+(success?"Target knocked Prone. "+proneMessage:"Target remains standing.")+'</p><small>Standard action; no damage. GM adjudicates target eligibility.</small></div>'});
 }

 static async grabTarget(){
  if(!this.isEditable)return;
  const selected=Array.from(game.user.targets);
  if(selected.length!==1){ui.notifications.warn("Target exactly one creature to initiate a Grab.");return;}
  const victim=selected[0]?.actor;
  if(!victim||!["terran","npc"].includes(victim.type)){ui.notifications.warn("Grab supports Terran and NPC targets.");return;}
  if(victim.id===this.document.id){ui.notifications.warn("You cannot grab yourself.");return;}
  const base=grabAthletics(this.document),tough=grabToughness(victim),esc=foundry.utils.escapeHTML;
  const chosen=await foundry.applications.api.DialogV2.prompt({
   window:{title:"Grab — "+victim.name},
   content:'<p>Grab is a standard action that provokes an opportunity attack. Roll Athletics plus special-combat size modifier vs target Toughness.</p>'+
    '<label>Athletics + size bonus <input type="number" name="bonus" step="1" value="'+(base??0)+'" required/></label>'+
    '<label>Target Toughness <input type="number" name="toughness" min="0" step="1" value="'+tough+'" required/></label>'+
    '<p>'+(base===null?"NPC Athletics is not stored yet; enter the correct bonus manually.":"Athletics and size bonus prefilled from your character.")+'</p>',
   ok:{label:"Roll Grab",callback:(event,button)=>({bonus:button.form.elements.bonus.value,toughness:button.form.elements.toughness.value})},rejectClose:false
  });
  if(!chosen)return;
  const bonus=Number(chosen.bonus),dc=Number(chosen.toughness);
  if(chosen.bonus===""||chosen.toughness===""||!Number.isFinite(bonus)||!Number.isFinite(dc)||dc<0){ui.notifications.warn("Enter valid Athletics bonus and Toughness.");return;}
  const roll=await new Roll("1d20 + @bonus",{bonus}).evaluate();
  const success=roll.total>=dc;
  let note="";
  if(success){try{if(typeof victim.toggleStatusEffect!=="function")throw Error("Status effects are unavailable.");if(!victim.canUserModify(game.user,"update"))throw Error("No permission to change target conditions; ask the GM to apply Grappled.");if(!victim.statuses.has("grappled"))await victim.toggleStatusEffect("grappled",{active:true});note="Grappled condition applied to "+victim.name+". Remove it manually when the grab ends.";}
   catch(error){note="Grab succeeded, but Grappled could not be applied: "+error.message;ui.notifications.warn(note);}}
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:this.document}),rolls:[roll],flavor:esc(this.document.name)+" — Grab",content:'<div class="sc-attack-details"><strong>'+(success?"SUCCESS":"FAILURE")+'</strong> — Grab vs '+esc(victim.name)+'<p>Athletics: '+roll.total+' vs Toughness '+dc+'</p><p>'+(success?esc(note):"Grab fails.")+'</p><small>Initiating Grab provokes an opportunity attack. The Grappled condition is applied to the target on success. Escape, movement, and releasing the condition are GM/player-managed.</small></div>'});
  await this.render();
 }
 static async releaseGrab(){
  if(!this.isEditable)return;
  try{await endGrab(this.document);await this.render();}catch(error){ui.notifications.warn(error.message);}
 }

 static async adjustMorale(event,target){if(!this.isEditable)return;try{await adjustMorale(this.document,Number(target.dataset.delta));await this.render();}catch(error){ui.notifications.error(error.message);}}

}

export class StarcraftItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud","sc-item-sheet"],position:{width:660,height:680},window:{resizable:true,title:"StarCraft Item Editor"},form:{submitOnChange:true,closeOnSubmit:false,handler:StarcraftItemSheet.save},actions:{chooseImage:StarcraftItemSheet.chooseImage,addRaceFeature:StarcraftItemSheet.addRaceFeature,removeRaceFeature:StarcraftItemSheet.removeRaceFeature,toggleRaceEditor:StarcraftItemSheet.toggleRaceEditor,changeRaceTab:StarcraftItemSheet.changeRaceTab,editRaceDescription:StarcraftItemSheet.editRaceDescription,saveRaceDescription:StarcraftItemSheet.saveRaceDescription,editRaceFeature:StarcraftItemSheet.editRaceFeature,saveRaceFeature:StarcraftItemSheet.saveRaceFeature}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/item-sheet.hbs"}};
 _raceTab="description";
 _raceEditor=false;
 _descriptionEditing=false;
 _featureEditing=new Set();
 _raceScrollPositions=new Map();
 _captureRaceScroll(){
  const root=this.element;if(!root)return;
  const nodes=[root,...root.querySelectorAll("*")].filter(el=>el.scrollHeight>el.clientHeight+1&&el.clientHeight>0);
  for(const el of nodes){
   const key=el===root?"root":this._raceScrollKey(el);
   if(key)this._raceScrollPositions.set(key,{top:el.scrollTop,left:el.scrollLeft});
  }
 }
 _raceScrollKey(el){
  if(el.classList.contains("hud-tab-content"))return "tab-content";
  if(el.classList.contains("window-content"))return "window-content";
  if(el.classList.contains("hud-shell"))return "hud-shell";
  const classes=["hud-race-description","hud-race-features","hud-race-prose"];
  return classes.find(k=>el.classList.contains(k))||null;
 }
 async _onRender(context,options){
  await super._onRender(context,options);
  const root=this.element;if(!root)return;
  const nodes=[root,...root.querySelectorAll("*")];
  for(const el of nodes){
   const key=el===root?"root":this._raceScrollKey(el);
   const position=key&&this._raceScrollPositions.get(key);
   if(position){el.scrollTop=position.top;el.scrollLeft=position.left;}
  }
 }
 async render(options={},...args){
  this._captureRaceScroll();
  return super.render(options,...args);
 }
 async _prepareContext(options){
  const context=await super._prepareContext(options),race=this.document.type==="race";
  const features=Array.from(this.document.system.raceFeatures||[],(f,i)=>({index:i,name:f.name,description:f.description,editing:this._raceEditor&&this._featureEditing.has(i)}));
  return {...context,item:this.document,s:this.document.system,isWeapon:this.document.type==="weapon",isArmor:this.document.type==="armor",isGear:this.document.type==="gear",isOrigin:["race","background","specialization"].includes(this.document.type),isRace:race,itemTypeLabel:this.document.type.toUpperCase(),itemDetailsTab:({race:"Character Creation",weapon:"Weapon Statistics",armor:"Armor Statistics",gear:"Gear",background:"Character Creation",specialization:"Character Creation",talent:"Talent Details",ability:"Ability Details"})[this.document.type]||"Details",raceTabDescription:this._raceTab==="description",raceEditor:this._raceEditor&&this.isEditable,descriptionEditing:this._raceEditor&&this._descriptionEditing&&this.isEditable,raceFeatures:features};
 }
 static _richValue(element){if(!element)return undefined;return element.value;}
 static async save(event,form,formData){if(!this._raceEditor)return;const data=formData.object;for(const el of this.element?.querySelectorAll('.hud-item-fields prose-mirror[name]')||[]){const value=this.constructor._richValue(el);if(value!==undefined)data[el.name]=value;}await this.document.update(data);}
 static async toggleRaceEditor(){
  if(!this.isEditable)return;
  if(this._raceEditor){await this._saveVisibleRaceFields();this._descriptionEditing=false;this._featureEditing.clear();}
  this._raceEditor=!this._raceEditor;await this.render();
 }
 async _saveVisibleRaceFields(){
  const root=this.element;
  const updates={};
  const fields=this.document.type==="race"?root?.querySelectorAll("[data-race-field]"):root?.querySelectorAll(".hud-item-fields [name],.hud-race-name input[name]");
  for(const el of fields||[]){if(!el.name||el.disabled)continue;updates[el.name]=el.tagName==="PROSE-MIRROR"?this.constructor._richValue(el):el.type==="number"?Number(el.value):el.type==="checkbox"?el.checked:el.value;}
  const name=root?.querySelector(".hud-race-name input[name]");if(name)updates.name=name.value;
  if(Object.keys(updates).length)await this.document.update(updates);
 }
 static async changeRaceTab(event,target){
  if(this._raceEditor)await this._saveVisibleRaceFields();
  this._raceTab=target.dataset.raceTab==="creation"?"creation":"description";
  await this.render();
 }
 static async editRaceDescription(){if(!this.isEditable||!this._raceEditor)return;this._descriptionEditing=true;await this.render();}
 static async saveRaceDescription(){
  if(!this.isEditable||!this._raceEditor)return;
  const value=this.element?.this._richValue(this.element?.querySelector("[data-race-description]"));
  if(value!==undefined)await this.document.update({"system.description":value});
  this._descriptionEditing=false;await this.render();
 }
 static async editRaceFeature(event,target){if(!this.isEditable||!this._raceEditor)return;this._featureEditing.add(Number(target.dataset.featureIndex));await this.render();}
 static async saveRaceFeature(event,target){
  if(!this.isEditable||!this._raceEditor)return;
  const i=Number(target.dataset.featureIndex),row=this.element?.querySelector('[data-feature-row="'+i+'"]');
  const entries=this.document.system.raceFeatures.map(x=>({name:x.name,description:x.description}));
  if(!row||!entries[i])return;
  entries[i]={name:row.querySelector("[data-feature-name]")?.value||"",description:this._richValue(row.querySelector("[data-feature-description]"))||""};
  await this.document.update({"system.raceFeatures":entries});
  this._featureEditing.delete(i);await this.render();
 }
 static async addRaceFeature(){
  if(!this.isEditable||!this._raceEditor||this.document.type!=="race")return;
  await this._saveVisibleRaceFields();
  const entries=this.document.system.raceFeatures.map(x=>({name:x.name,description:x.description}));
  const i=entries.length;entries.push({name:"",description:""});
  this._featureEditing.add(i);await this.document.update({"system.raceFeatures":entries});await this.render();
 }
 static async removeRaceFeature(event,target){
  if(!this.isEditable||!this._raceEditor||this.document.type!=="race")return;
  const i=Number(target.dataset.featureIndex),entries=this.document.system.raceFeatures.map(x=>({name:x.name,description:x.description}));
  if(!Number.isInteger(i)||i<0||i>=entries.length)return;
  entries.splice(i,1);
  this._featureEditing=new Set([...this._featureEditing].filter(n=>n!==i).map(n=>n>i?n-1:n));
  await this.document.update({"system.raceFeatures":entries});await this.render();
 }
 static async chooseImage(){
  if(!this.isEditable||!this._raceEditor)return;
  const picker=new foundry.applications.apps.FilePicker({type:"image",current:this.document.img,callback:async img=>{await this.document.update({img});await this.render();}});picker.render(true);
 }
}

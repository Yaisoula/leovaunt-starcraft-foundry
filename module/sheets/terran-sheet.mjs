import {calculateTerran,ATTRIBUTE_LABELS,SKILL_ATTRIBUTES,PROWESS_LABELS,label} from "../rules/terran.mjs";
export class TerranSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud"],position:{width:1000,height:760},window:{resizable:true,title:"Terran Personnel HUD"},form:{submitOnChange:true,closeOnSubmit:false,handler:TerranSheet.onFormSubmit},actions:{rollSkill:TerranSheet.rollSkill,rollAttribute:TerranSheet.rollAttribute,changeTab:TerranSheet.changeTab}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/terran-sheet.hbs"}};
 _activeTab="overview";
 static async changeTab(event,target){const next=target.dataset.tab;if(!["overview","skills","combat","inventory","talents","progression","psionics"].includes(next))return;this._activeTab=next;await this.render();}
 async _prepareContext(options){const context=await super._prepareContext(options),actor=this.document,s=actor.system,d=calculateTerran(s);
 return {...context,actor,s,derived:d,tab:this._activeTab,tabs:["overview","skills","combat","inventory","talents","progression","psionics"].map(key=>({key,title:key[0].toUpperCase()+key.slice(1),active:key===this._activeTab})),
 attributes:Object.entries(ATTRIBUTE_LABELS).map(([key,name])=>({key,name,base:s.attributes[key].base,misc:s.attributes[key].misc,total:d.attributes[key]})),
 skills:Object.entries(SKILL_ATTRIBUTES).map(([key,attribute])=>({key,name:label(key),attribute:ATTRIBUTE_LABELS[attribute],ranks:s.skills[key].ranks,misc:s.skills[key].misc,total:d.skillTotals[key],focus:s.skills[key].focus,max:d.limits[key],over:Number(s.skills[key].ranks)>d.limits[key]})),
 prowess:Object.entries(PROWESS_LABELS).map(([key,name])=>({key,name,ranks:s.prowess[key].ranks,focus:s.prowess[key].focus,max:d.prowessLimits[key],over:Number(s.prowess[key].ranks)>d.prowessLimits[key]}))};}
 static async onFormSubmit(event,form,formData){await this.document.update(formData.object);}
 static async rollSkill(event,target){const k=target.dataset.skill,d=calculateTerran(this.document.system);if(!(k in d.skillTotals))return;await new Roll(`1d20 + ${d.skillTotals[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${label(k)} check`});}
 static async rollAttribute(event,target){const k=target.dataset.attribute,d=calculateTerran(this.document.system);if(!(k in d.attributes))return;await new Roll(`1d20 + ${d.attributes[k]}`).toMessage({speaker:ChatMessage.getSpeaker({actor:this.document}),flavor:`${this.document.name} — ${ATTRIBUTE_LABELS[k]} check`});}
}

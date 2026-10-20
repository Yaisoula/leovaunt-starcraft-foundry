export class StarcraftItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2){
 static DEFAULT_OPTIONS={classes:["leovaunt","terran-hud","sc-item-sheet"],position:{width:660,height:680},window:{resizable:true,title:"StarCraft Item Editor"},form:{submitOnChange:true,closeOnSubmit:false,handler:StarcraftItemSheet.save},actions:{chooseImage:StarcraftItemSheet.chooseImage}};
 static PARTS={main:{template:"systems/leovaunt-starcraft/templates/item-sheet.hbs"}};
 async _prepareContext(options){const context=await super._prepareContext(options);return {...context,item:this.document,s:this.document.system,isWeapon:this.document.type==="weapon",isArmor:this.document.type==="armor",isGear:this.document.type==="gear"};}
 static async save(event,form,formData){await this.document.update(formData.object);}
 static async chooseImage(){if(!this.isEditable)return;const picker=new foundry.applications.apps.FilePicker({type:"image",current:this.document.img,callback:async img=>{await this.document.update({img});await this.render();}});picker.render(true);}
}

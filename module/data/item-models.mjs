const f=foundry.data.fields;
export class StarcraftItemDataModel extends foundry.abstract.TypeDataModel{
 static defineSchema(){return {description:new f.HTMLField({required:true,initial:""}),quantity:new f.NumberField({required:true,initial:1,min:0}),weight:new f.NumberField({required:true,initial:0,min:0}),equipped:new f.BooleanField({initial:false}),notes:new f.StringField({initial:""})};}
}

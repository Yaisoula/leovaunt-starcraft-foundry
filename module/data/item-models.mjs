const f=foundry.data.fields;
const number=(initial=0,min)=>new f.NumberField({required:true,nullable:false,initial,...(min===undefined?{}:{min})});
const string=(initial="")=>new f.StringField({required:true,blank:true,initial});
export class StarcraftItemDataModel extends foundry.abstract.TypeDataModel{
 static defineSchema(){return {
 description:new f.HTMLField({required:true,initial:""}),
 quantity:number(1,0),weight:number(0,0),cost:number(0,0),tier:number(1,1),
 equipped:new f.BooleanField({initial:false}),notes:string(),raceSize:string("medium"),racePsiLevel:number(0,0),raceAttributes:new f.SchemaField(Object.fromEntries(["strength","instinct","agility","fortitude","intelligence","willpower"].map(k=>[k,number(0)]))),raceFeatures:new f.ArrayField(new f.SchemaField({name:string(),description:string()}),{initial:[]}),
 // Weapon statistics, per Leovaunt Core Rulebook, Weapons chapter.
 weaponClass:string(),hands:number(2,1),damage:number(),accuracy:number(),rateOfFire:string("Average"),
 range:string("Medium"),shots:number(0,0),currentShots:number(0,0),ammunition:string(),
 powerRating:number(),specialTraits:string(),jammed:new f.BooleanField({initial:false}),
 // Armor values are additional to the character's manual situational modifiers.
 armorResistance:number(),armorDefensePenalty:number(),armorType:string(),armorRating:number()
 }; }
}

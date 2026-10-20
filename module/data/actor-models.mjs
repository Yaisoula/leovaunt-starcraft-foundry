const f=foundry.data.fields;
const num=(initial=0)=>new f.NumberField({required:true,nullable:false,initial});
const str=()=>new f.StringField({required:true,blank:true,initial:""});
const pair=()=>new f.SchemaField({value:num(),max:num()});
const SKILLS=["acrobatics","athletics","computers","endurance","influence","leadership","lore","medicine","perception","pilot","psionics","science","stealth","survival","tactics"];
const PROWESS=["defensiveTraining","durability","melee","mentalTraining","ranged"];
export class TerranDataModel extends foundry.abstract.TypeDataModel{
 static defineSchema(){return {player:str(),background:str(),faction:str(),quirk:str(),level:num(1),experience:num(),powerLevel:new f.StringField({required:true,initial:"heroic",choices:["heroic","advanced","epic"]}),heroic:new f.BooleanField({initial:true}),
 attributes:new f.SchemaField(Object.fromEntries(["strength","instinct","agility","fortitude","intelligence","willpower"].map(k=>[k,new f.SchemaField({base:num(),misc:num()})]))),
 skills:new f.SchemaField(Object.fromEntries(SKILLS.map(k=>[k,new f.SchemaField({ranks:num(),misc:num(),temp:num(),focus:num()})]))),
 prowess:new f.SchemaField(Object.fromEntries(PROWESS.map(k=>[k,new f.SchemaField({ranks:num(),focus:num()})]))),
 resources:new f.SchemaField({hp:pair(),shields:pair(),fatigue:pair(),healing:pair(),credits:num(),characteristicPoints:num(),bankedPoints:num()}),
 combat:new f.SchemaField({shieldArmor:num(),armorDefensePenalty:num(),armorResistance:num(),psiLevel:num(),sizeDefense:num(),sizeToughness:num(),bonusHP:num(),defenseMisc:num(),toughnessMisc:num(),resolveMisc:num(),thresholdMisc:num(),resistanceMisc:num(),psionicMisc:num(),speedMisc:num(),shiftMisc:num(),initiativeMisc:num(),moraleMisc:num()}),notes:str()};}
}
export class DeferredDataModel extends foundry.abstract.TypeDataModel{static defineSchema(){return {notes:str()};}}

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
 resources:new f.SchemaField({hp:pair(),shields:pair(),protection:num(),woundsPending:num(),fatigue:pair(),healing:pair(),credits:num(),characteristicPoints:num(),bankedPoints:num()}),
 combat:new f.SchemaField({shieldArmor:num(),armorDefensePenalty:num(),armorResistance:num(),psiLevel:num(),sizeDefense:num(),sizeToughness:num(),bonusHP:num(),defenseMisc:num(),toughnessMisc:num(),resolveMisc:num(),thresholdMisc:num(),resistanceMisc:num(),psionicMisc:num(),speedMisc:num(),shiftMisc:num(),initiativeMisc:num(),moraleMisc:num()}),notes:str()};}
}
export class DeferredDataModel extends foundry.abstract.TypeDataModel{static defineSchema(){return {notes:str()};}}

/** A single flexible NPC model shared by Terran, Zerg, Protoss and other NPC species.
 * Statistics are editable because species-specific NPC rules are not complete yet. */
export class NpcDataModel extends foundry.abstract.TypeDataModel {
 static defineSchema(){return {
  species:new f.StringField({required:true,initial:"terran",choices:["terran","zerg","protoss","other"]}),
  faction:str(),level:num(1),role:str(),notes:str(),
  defenses:new f.SchemaField({defense:num(10),toughness:num(10),resolve:num(10),damageResistance:num(),damageThreshold:num(16),shieldArmor:num()}),
  resources:new f.SchemaField({hp:pair(),shields:pair(),protection:num(),woundsPending:num()}),
  attributes:new f.SchemaField(Object.fromEntries(["strength","instinct","agility","fortitude","intelligence","willpower"].map(k=>[k,num()]))),
  prowess:new f.SchemaField({melee:num(),ranged:num()}),
  };
 }
}

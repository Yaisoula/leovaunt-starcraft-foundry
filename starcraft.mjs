import {TerranDataModel,DeferredDataModel,NpcDataModel} from "./module/data/actor-models.mjs";
import {StarcraftItemDataModel} from "./module/data/item-models.mjs";
import {StarcraftItemSheet} from "./module/sheets/item-sheet.mjs";
import {NpcSheet} from "./module/sheets/npc-sheet.mjs";
import {TerranSheet} from "./module/sheets/terran-sheet.mjs";
Hooks.once("init",()=>{
 CONFIG.Actor.dataModels={...CONFIG.Actor.dataModels,terran:TerranDataModel,zerg:DeferredDataModel,protoss:DeferredDataModel,npc:NpcDataModel};
 CONFIG.Item.dataModels={...CONFIG.Item.dataModels,...Object.fromEntries(["weapon","armor","gear","talent","ability"].map(k=>[k,StarcraftItemDataModel]))};
 foundry.documents.collections.Actors.registerSheet("leovaunt-starcraft",TerranSheet,{types:["terran"],makeDefault:true,label:"Terran Personnel HUD"});
 foundry.documents.collections.Items.registerSheet("leovaunt-starcraft",StarcraftItemSheet,{types:["weapon","armor","gear","talent","ability"],makeDefault:true,label:"StarCraft Item Editor"});
 foundry.documents.collections.Actors.registerSheet("leovaunt-starcraft",NpcSheet,{types:["npc"],makeDefault:true,label:"Unified NPC Sheet"});
});

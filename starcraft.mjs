import {TerranDataModel,DeferredDataModel} from "./module/data/actor-models.mjs";
import {StarcraftItemDataModel} from "./module/data/item-models.mjs";
import {TerranSheet} from "./module/sheets/terran-sheet.mjs";
Hooks.once("init",()=>{
 CONFIG.Actor.dataModels={...CONFIG.Actor.dataModels,terran:TerranDataModel,zerg:DeferredDataModel,protoss:DeferredDataModel,npc:DeferredDataModel};
 CONFIG.Item.dataModels={...CONFIG.Item.dataModels,...Object.fromEntries(["weapon","armor","gear","talent","ability"].map(k=>[k,StarcraftItemDataModel]))};
 foundry.documents.collections.Actors.registerSheet("leovaunt-starcraft",TerranSheet,{types:["terran"],makeDefault:true,label:"Terran Personnel HUD"});
});

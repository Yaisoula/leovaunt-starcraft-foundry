import {STARCRAFT_STATUS_EFFECTS} from "./module/status-effects.mjs";
import {registerDamageChatActions} from "./module/damage-chat.mjs";
import {woundConditions} from "./module/rules/wounds.mjs";
import {TerranDataModel,DeferredDataModel,NpcDataModel} from "./module/data/actor-models.mjs";
import {StarcraftItemDataModel} from "./module/data/item-models.mjs";
import {StarcraftItemSheet} from "./module/sheets/item-sheet.mjs";
import {NpcSheet} from "./module/sheets/npc-sheet.mjs";
import {TerranSheet} from "./module/sheets/terran-sheet.mjs";
Hooks.once("init",()=>{
 registerDamageChatActions();
 CONFIG.statusEffects=STARCRAFT_STATUS_EFFECTS;
 CONFIG.Actor.dataModels={...CONFIG.Actor.dataModels,terran:TerranDataModel,zerg:DeferredDataModel,protoss:DeferredDataModel,npc:NpcDataModel};
 CONFIG.Item.dataModels={...CONFIG.Item.dataModels,...Object.fromEntries(["weapon","armor","gear","talent","ability","race","background","specialization"].map(k=>[k,StarcraftItemDataModel]))};
 foundry.documents.collections.Actors.registerSheet("leovaunt-starcraft",TerranSheet,{types:["terran"],makeDefault:true,label:"Terran Personnel HUD"});
 foundry.documents.collections.Items.registerSheet("leovaunt-starcraft",StarcraftItemSheet,{types:["weapon","armor","gear","talent","ability","race","background","specialization"],makeDefault:true,label:"StarCraft Item Editor"});
 foundry.documents.collections.Actors.registerSheet("leovaunt-starcraft",NpcSheet,{types:["npc"],makeDefault:true,label:"Unified NPC Sheet"});
});

/** Keep the wound tracker in sync if a GM toggles Prone from the token HUD. */
function syncProneFromEffect(effect){
 const actor=effect?.parent;
 if(!game.user.isGM||!actor||!["terran","npc"].includes(actor.type))return;
 if(!effect.statuses?.has("prone"))return;
 const active=actor.statuses.has("prone");
 if(woundConditions(actor).prone===active)return;
 return actor.setFlag("leovaunt-starcraft","woundConditions",{...woundConditions(actor),prone:active});
}
Hooks.on("createActiveEffect",syncProneFromEffect);
Hooks.on("deleteActiveEffect",syncProneFromEffect);
Hooks.on("updateActiveEffect",syncProneFromEffect);

// New Terran characters choose a power level once; existing characters remain locked as-is.
Hooks.on("preCreateActor",(actor)=>{
 if(actor.type!=="terran")return;
 actor.updateSource({"flags.leovaunt-starcraft.powerLevelConfirmed":false,"flags.leovaunt-starcraft.raceConfirmed":false});
});

// Give newly created race entries a meaningful name instead of Foundry's generic Item.
Hooks.on("preCreateItem",(item)=>{
 if(item.type!=="race"||item.parent)return;
 if(!item.name||item.name==="Item")item.updateSource({name:"New Race"});
});

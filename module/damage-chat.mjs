import {targetProfile} from "./rules/targeting.mjs";
import {resolveAttackDamage} from "./rules/damage.mjs";

const FLAG="leovaunt-starcraft";
const busy=new Set();
const whole=v=>Math.max(0,Math.trunc(Number(v)||0));
function isValidEntry(entry){
 return entry&&typeof entry.uuid==="string"&&entry.uuid.length<300&&["terran","npc"].includes(entry.type)&&
 ["damage","penetration","rending","hailfire"].every(k=>Number.isSafeInteger(entry[k])&&entry[k]>=0&&entry[k]<=100000);
}
export function registerDamageChatActions(){
 Hooks.on("renderChatMessage",(message,html)=>{
  const root=html instanceof HTMLElement?html:html?.[0];
  if(!root)return;
  for(const button of root.querySelectorAll("[data-sc-apply-damage]")){
   const index=Number(button.dataset.scApplyDamage);
   const entries=message.getFlag(FLAG,"damageApplications")??[];
   const entry=entries[index];
   const applied=message.getFlag(FLAG,"appliedDamage")??[];
   if(!game.user.isGM||!isValidEntry(entry)||applied.includes(index)){button.disabled=true;button.hidden=!game.user.isGM;continue;}
   button.addEventListener("click",async()=>{
    if(!game.user.isGM)return;
    const key=message.id+":"+index;
    if(busy.has(key))return;
    busy.add(key);button.disabled=true;
    try{
     const fresh=game.messages.get(message.id)??message;
     if((fresh.getFlag(FLAG,"appliedDamage")??[]).includes(index))throw Error("Damage has already been applied.");
     const actor=await fromUuid(entry.uuid);
     if(!actor||actor.type!==entry.type)throw Error("Target actor is no longer available.");
     const profile=targetProfile(actor);
     if(!profile)throw Error("Target does not support physical damage.");
     const result=resolveAttackDamage({...entry,shield:profile.shield,shieldArmor:profile.shieldArmor,resistance:profile.damageResistance,protection:profile.protection,hp:profile.hp,threshold:profile.damageThreshold});
     const confirm=await foundry.applications.api.DialogV2.confirm({
      window:{title:"Apply Damage — "+actor.name},
      content:"<p>Apply <strong>"+entry.damage+"</strong> base damage to <strong>"+foundry.utils.escapeHTML(actor.name)+"</strong>?</p><p>Shields −"+result.shieldAbsorbed+" · Protection −"+result.protectionAbsorbed+" · HP −"+result.hpLost+" · Pending wounds +"+result.wounds+"</p><p>Uses target's <strong>current</strong> defenses and resources.</p>",
      rejectClose:false,modal:true
     });
     if(!confirm)return;
     if((fresh.getFlag(FLAG,"appliedDamage")??[]).includes(index))throw Error("Damage has already been applied.");
     await actor.update({
      "system.resources.shields.value":result.shieldRemaining,
      "system.resources.protection":result.protectionRemaining,
      "system.resources.hp.value":result.hpRemaining,
      "system.resources.woundsPending":whole(actor.system.resources.woundsPending)+result.wounds
     });
     await fresh.setFlag(FLAG,"appliedDamage",[...(fresh.getFlag(FLAG,"appliedDamage")??[]),index]);
     await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:"<strong>Damage applied to "+foundry.utils.escapeHTML(actor.name)+"</strong><p>Shields −"+result.shieldAbsorbed+" · Protection −"+result.protectionAbsorbed+" · HP −"+result.hpLost+" · Pending wounds +"+result.wounds+"</p>"});
     ui.notifications.info("Damage applied to "+actor.name);
    }catch(error){ui.notifications.error(error.message);}
    finally{busy.delete(key);button.disabled=false;}
   });
  }
 });
}

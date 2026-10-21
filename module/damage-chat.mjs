import {resolveAttackWounds,WOUND_RULES} from "./rules/wounds.mjs";
import {targetProfile} from "./rules/targeting.mjs";
import {resolveAttackDamage} from "./rules/damage.mjs";

const FLAG="leovaunt-starcraft";
const busy=new Set();
const woundCountsFlag="appliedWoundCounts";
const whole=v=>Math.max(0,Math.trunc(Number(v)||0));
function isValidEntry(entry){
 return entry&&typeof entry.uuid==="string"&&entry.uuid.length<300&&["terran","npc"].includes(entry.type)&&
 ["damage","penetration","rending","hailfire"].every(k=>Number.isSafeInteger(entry[k])&&entry[k]>=0&&entry[k]<=100000);
}
export function registerDamageChatActions(){
 Hooks.on("renderChatMessage",(message,html)=>{
  const root=html instanceof HTMLElement?html:html?.[0];
  if(!root)return;
  const entries=message.getFlag(FLAG,"damageApplications")??[];
  const applied=message.getFlag(FLAG,"appliedDamage")??[];
  const resolved=message.getFlag(FLAG,"resolvedWounds")??[];
  const counts=message.getFlag(FLAG,woundCountsFlag)??{};
  for(const button of root.querySelectorAll("[data-sc-apply-damage]")){
   const index=Number(button.dataset.scApplyDamage);
   const count=counts[index];
   if(applied.includes(index)&&Number.isSafeInteger(count)&&count>0&&!resolved.includes(index)){
    const woundButton=document.createElement("button");
    woundButton.type="button";
    woundButton.textContent="Resolve Wounds";
    woundButton.dataset.scResolveWounds=String(index);
    button.insertAdjacentElement("afterend",woundButton);
   }
  }
  for(const button of root.querySelectorAll("[data-sc-resolve-wounds]")){
   const index=Number(button.dataset.scResolveWounds);
   const entry=entries[index],count=counts[index];
   if(!game.user.isGM||!isValidEntry(entry)||!applied.includes(index)||resolved.includes(index)||!Number.isSafeInteger(count)||count<1||count>100){button.disabled=true;button.hidden=!game.user.isGM;continue;}
   button.addEventListener("click",async()=>{
    const key=message.id+":wounds:"+index;
    if(!game.user.isGM||busy.has(key))return;
    busy.add(key);button.disabled=true;
    try{
     const fresh=game.messages.get(message.id)??message;
     if((fresh.getFlag(FLAG,"resolvedWounds")??[]).includes(index))throw Error("These wounds have already been resolved.");
     const actor=await fromUuid(entry.uuid);
     if(!actor||actor.type!==entry.type)throw Error("Target actor is unavailable.");
     const pending=whole(actor.system.resources.woundsPending);
     if(pending<count)throw Error("Target has fewer pending wounds than this attack. Review manually.");
     const confirmed=await foundry.applications.api.DialogV2.confirm({
      window:{title:"Resolve Wounds — "+actor.name},
      content:"<p>Roll and apply <strong>"+count+"</strong> wound point(s) to <strong>"+foundry.utils.escapeHTML(actor.name)+"</strong>?</p><p>"+(entry.individualWounds?"Roll a separate location for every point (burst/Hailfire).":"All points share one location (single hit).")+"</p><p>Immediate wound effects and maiming will be applied. Item drops require GM selection.</p>",
      rejectClose:false,modal:true
     });
     if(!confirmed)return;
     const outcome=await resolveAttackWounds(actor,{count,individual:Boolean(entry.individualWounds),source:"Weapon attack — "+message.id});
     await fresh.setFlag(FLAG,"resolvedWounds",[...(fresh.getFlag(FLAG,"resolvedWounds")??[]),index]);
     const esc=foundry.utils.escapeHTML;
     const details=outcome.summary.map(s=>"<li>"+esc(s.location)+" (d20 "+s.die+"): "+s.points+" wound point(s); "+esc(WOUND_RULES[s.location].immediate)+(s.maiming?"; maiming ×"+s.maiming:"")+"</li>").join("");
     await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:"<strong>Wounds resolved — "+esc(actor.name)+"</strong><ul>"+details+"</ul><p>Pending wounds remaining: "+outcome.remaining+"</p>"+(outcome.needsDrop?"<p><strong>GM:</strong> choose an equipped one-handed item to drop on the target's sheet.</p>":"")+(outcome.maiming?"<p><strong>GM:</strong> describe maimed anatomy in permanent injury records.</p>":"")+(outcome.deceased?"<p><strong>Lethal wound threshold reached.</strong></p>":"")});
     ui.notifications.info("Resolved "+count+" wounds on "+actor.name);
    }catch(error){ui.notifications.error(error.message);}
    finally{busy.delete(key);button.disabled=false;}
   });
  }
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
     const result=resolveAttackDamage({...entry,shield:profile.shield,shieldArmor:profile.shieldArmor,resistance:profile.damageResistance,protection:profile.protection,hp:profile.hp,threshold:profile.damageThreshold,damageType:entry.damageType||"physical",targetIsConstruct:profile.targetIsConstruct,targetArmorType:profile.targetArmorType,psionicResistance:profile.psionicResistance});
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
     if(result.wounds>0)await fresh.setFlag(FLAG,woundCountsFlag,{...(fresh.getFlag(FLAG,woundCountsFlag)??{}),[index]:result.wounds});
     await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:"<strong>Damage applied to "+foundry.utils.escapeHTML(actor.name)+"</strong><p>Shields −"+result.shieldAbsorbed+" · Protection −"+result.protectionAbsorbed+" · HP −"+result.hpLost+" · Pending wounds +"+result.wounds+"</p>"});
     if(entry.suppress&&(result.hpLost>0||result.protectionAbsorbed>0))ui.notifications.info("Suppressing Fire hit: GM should mark Slowed on the target token and reduce morale by 1.");
     ui.notifications.info("Damage applied to "+actor.name+(result.wounds?" — resolve wounds in chat.":""));
    }catch(error){ui.notifications.error(error.message);}
    finally{busy.delete(key);button.disabled=false;}
   });
  }
 });
}

import {chargeDefensePenalty} from "./charging.mjs";
import {actorWoundPenalties,woundState} from "./wounds.mjs";
import {calculateTerran} from "./terran.mjs";
import {resolvePhysicalDamage,parsePhysicalTraits} from "./damage.mjs";
export function targetProfile(actor){
 if(!actor || !["terran","npc"].includes(actor.type))return null;
 const s=actor.system, npc=actor.type==="npc", wp=actorWoundPenalties(actor), stats=npc?{...s.defenses,defense:s.defenses.defense-wp.defense,damageResistance:Math.max(0,s.defenses.damageResistance-wp.damageResistance)}:calculateTerran(s,actor.items,woundState(actor).points).computed;
 return {actor,defense:stats.defense-chargeDefensePenalty(actor),damageResistance:npc?stats.damageResistance:stats.damageResistance,
 shieldArmor:npc?stats.shieldArmor:s.combat.shieldArmor,damageThreshold:stats.damageThreshold,
 targetIsConstruct:Boolean(s.isConstruct||s.construct),targetArmorType:npc?String(s.defenses?.armorType||""):String(actor.items.find(i=>i.type==="armor"&&i.system.equipped)?.system.armorType||""),psionicResistance:stats.psionicResistance??s.defenses?.psionicResistance??0,shield:s.resources.shields.value,protection:s.resources.protection,hp:s.resources.hp.value};
}
export function previewPhysicalDamage(profile,damage,traits){
 return resolvePhysicalDamage({damage,penetration:traits.penetration,rending:traits.rending,shield:profile.shield,shieldArmor:profile.shieldArmor,resistance:profile.damageResistance,protection:profile.protection,hp:profile.hp,threshold:profile.damageThreshold});
}
export function attackDetailHtml({name,attack,outcome,target,traits,preview}){
 const esc=foundry.utils.escapeHTML;
 let html='<div class="sc-attack-details"><strong>'+esc(name)+'</strong><p>Strikes: '+attack.strikes+' · Ammo used: '+attack.ammoNeeded+'</p>';
 if(!outcome)return html+'<p>No supported target Defense; resolve the hit manually.</p></div>';
 html+='<p><strong>'+(outcome.hit?'HIT':'MISS')+'</strong> vs Defense '+outcome.defense+(target?' ('+esc(target.actor.name)+')':'')+'</p>';
 if(outcome.hit){html+='<p>Weapon damage: '+attack.damage+'<br>Overage: +'+outcome.overage+' (cap '+attack.overageCap+')<br><strong>Pre-resistance damage: '+outcome.damage+'</strong><br>Penetration: '+traits.penetration+' · Rending: '+traits.rending+'</p>';
 if(preview)html+='<p>Damage preview: Shields -'+preview.shieldAbsorbed+' · Protection -'+preview.protectionAbsorbed+' · HP -'+preview.hpLost+' · Pending wounds +'+preview.wounds+'</p>';
 }else html+='<p>No damage.</p>';
 return html+'<small>Preview only. Review and confirm damage separately; special traits and wound effects remain manual.</small></div>';
}
export function traitsForWeapon(item){return parsePhysicalTraits(item.system.specialTraits);}

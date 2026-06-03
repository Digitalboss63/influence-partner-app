import { Creator, Product, OutreachTone, OutreachChannel } from '../types/influencePartner';

export function generateOutreachMessage(
  creator: Creator,
  product: Product,
  channel: OutreachChannel,
  tone: OutreachTone
): string {
  const isDM = channel.includes('DM');
  const greeting = tone === 'Friendly' ? `Hey ${creator.name}! 👋` : `Hi ${creator.name},`;
  const intro = tone === 'Direct' 
    ? `I'm reaching out from ${product.name}. We're looking for high-quality partners in the ${creator.niche} space.`
    : tone === 'High-Commission Offer'
    ? `We've been following your ${channel.split(' ')[0]} content and think you'd be a perfect fit for a high-value partnership with ${product.name}.`
    : `I've been a fan of your content on ${channel.split(' ')[0]}, specifically your recent posts in the ${creator.niche} niche.`;

  const whySelected = `Your audience fit is incredible. ${creator.suggestedOutreachAngle || 'We love your authentic approach.'} `;
  
  const productPitch = `At ${product.name}, we help ${product.targetCustomer} to ${product.mainBenefit}. `;

  let commissionAngle = '';
  if (tone === 'High-Commission Offer' || creator.fitScore >= 80) {
    commissionAngle = `Because distribution is our bottleneck, we treat creators as true partners. We can offer you a ${product.commissionOffer}% revenue share, which is significantly higher than industry standard. `;
  }

  const cta = isDM
    ? `Are you open to discussing a potential partnership? Let me know and I can send over more details.`
    : `Would you be open to a quick 5-min chat next week to see if there's a mutual fit? Let me know what time works best for you.`;

  const signoff = tone === 'Friendly' ? `Best,\n[Your Name]` : `Best regards,\n[Your Name]\nPartnerships @ ${product.name}`;

  if (isDM) {
    return `${greeting}\n\n${intro} ${productPitch}${whySelected}${commissionAngle}\n\n${cta}`;
  }

  return `Subject: Partnership Inquiry: ${creator.name} x ${product.name}\n\n${greeting}\n\n${intro}\n\n${whySelected}\n\n${productPitch}\n\n${commissionAngle}\n\n${cta}\n\n${signoff}`;
}

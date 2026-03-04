import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionResponse,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { storage } from './storage';

// Initialize the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

export function getBotStatus() {
  return {
    online: client.isReady(),
    guildsCount: client.guilds.cache.size,
    ping: client.ws.ping,
  };
}

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up the channels for properties and businesses')
    .addChannelOption(option =>
      option.setName('properties')
        .setDescription('The channel for property listings')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('businesses')
        .setDescription('The channel for the open businesses embed')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('refresh_listings')
    .setDescription('Send or refresh all property listings in the configured channel (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('business_create')
    .setDescription('Create a new business (Admin only)')
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('The role assigned to employees of this business')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the business')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('property_sell')
    .setDescription('Sell a property (Admin only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user who bought the property')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name of the property')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('location')
        .setDescription('Location of the property')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('permit')
        .setDescription('Permit link')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('intended_use')
        .setDescription('Intended use of the property')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('photo')
        .setDescription('Photo of the property')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('business_online')
    .setDescription('Mark a business as online (Requires business role)')
    .addUserOption(option =>
      option.setName('employee')
        .setDescription('The active employee (@them) (or yourself if empty) - optional')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('business_offline')
    .setDescription('Mark a business as offline (Requires business role or Admin)')
    .addStringOption(option =>
      option.setName('business')
        .setDescription('The name of the business (Admins only)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('business_remove')
    .setDescription('Remove a business (Admin only)')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the business to remove')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('property_add')
    .setDescription('Add a new property to the listing (Admin only)')
    .addStringOption(option => option.setName('name').setDescription('Name of the property').setRequired(true))
    .addStringOption(option => option.setName('permit').setDescription('Permit link').setRequired(true))
    .addStringOption(option => option.setName('cost').setDescription('Cost of the property').setRequired(true))
    .addStringOption(option => option.setName('intended_use').setDescription('Intended use').setRequired(true))
    .addStringOption(option => option.setName('criminal_allowed').setDescription('Criminal activity allowed Y/N').setRequired(true).addChoices({ name: 'Yes', value: 'Y' }, { name: 'No', value: 'N' }))
    .addStringOption(option => option.setName('bought_on').setDescription('Bought on DATE').setRequired(true))
    .addAttachmentOption(option => option.setName('photo').setDescription('Main photo of the property').setRequired(true))
    .addStringOption(option => option.setName('owner').setDescription('Owner name (optional)').setRequired(false))
    .addStringOption(option => option.setName('gallery').setDescription('Photos for media gallery (comma separated URLs)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('property_edit')
    .setDescription('List and edit properties (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
];

async function updatePropertyListing(guildId: string) {
  const config = await storage.getServerConfig(guildId);
  if (!config || !config.propertiesChannelId) return;

  const channel = await client.channels.fetch(config.propertiesChannelId) as TextChannel;
  if (!channel) return;

  const properties = await storage.getProperties(guildId);
  
  for (const prop of properties) {
    const isOwned = !!prop.owner && prop.owner.trim() !== "";
    
    const embed = new EmbedBuilder()
      .setTitle(`🏠 ${prop.name.toUpperCase()}`)
      .setThumbnail(prop.thumbnail)
      .setColor(isOwned ? 0x95a5a6 : 0x2ecc71)
      .addFields(
        { name: '👤 OWNER', value: isOwned ? `**${prop.owner}**` : "🟢 *Available for Purchase*", inline: true },
        { name: '💰 COST', value: `\`${prop.cost}\``, inline: true },
        { name: '📝 INTENDED USE', value: prop.intendedUse, inline: true },
        { name: '⚖️ CRIMINAL ACTIVITY', value: prop.criminalActivity ? "✅ Allowed" : "❌ Prohibited", inline: true },
        { name: '📅 BOUGHT ON', value: prop.boughtOn, inline: true },
        { name: '📜 PERMIT', value: `[Click to View](${prop.permit})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "PROPERTY MANAGEMENT SYSTEM V2" });

    if (prop.mediaGallery && prop.mediaGallery.length > 0) {
      embed.setImage(prop.mediaGallery[0]); 
    }

    const buyButton = new ButtonBuilder()
      .setLabel('Buy')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/channels/1475205068058787840');

    const row = new ActionRowBuilder<ButtonBuilder>();
    
    if (isOwned) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`owned_status_${prop.id}`)
          .setLabel('Owned')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );
    } else {
      row.addComponents(buyButton);
    }

    await channel.send({ embeds: [embed], components: [row] });
  }
}

async function updateBusinessEmbed(guildId: string) {
  const config = await storage.getServerConfig(guildId);
  if (!config || !config.businessesChannelId) return;

  const businesses = await storage.getBusinesses(guildId);
  const online = businesses.filter(b => b.isOnline);
  const totalEmployees = online.reduce((acc, b) => acc + (b.employeeIds?.length || 0), 0);
  
  const embed = new EmbedBuilder()
    .setTitle("🏢 BUSINESS STATUS DASHBOARD")
    .setColor(online.length > 0 ? 0x2ecc71 : 0xe74c3c)
    .setThumbnail(client.user?.displayAvatarURL() || null)
    .setDescription(
      `>>> **Welcome to the Live Business Directory.**\n` +
      `Below is the real-time status of all registered establishments.\n\n` +
      `**Current Statistics**\n` +
      `🟢 **Open:** \`${online.length}\` | 🔴 **Closed:** \`${businesses.length - online.length}\` | 👥 **Active Staff:** \`${totalEmployees}\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .setTimestamp()
    .setFooter({ 
      text: "SYSTEM LIVE • REAL-TIME UPDATES",
      iconURL: client.user?.displayAvatarURL()
    });

  if (businesses.length === 0) {
    embed.addFields({ name: "⚠️ System Notice", value: "No businesses have been registered in the database yet." });
  } else {
    if (online.length > 0) {
      const onlineList = online.map(b => {
        const staff = b.employeeIds && b.employeeIds.length > 0 
          ? b.employeeIds.map(id => `<@${id}>`).join(", ")
          : "System Online";
        return `✅ **${b.name.toUpperCase()}**\n└ 👥 **Staff:** ${staff}`;
      }).join("\n\n");
      
      embed.addFields({ name: "🟢 OPEN ESTABLISHMENTS", value: onlineList });
    }

    const offline = businesses.filter(b => !b.isOnline);
    if (offline.length > 0) {
      const offlineList = offline.map(b => `❌ **${b.name.toUpperCase()}**`).join("\n");
      embed.addFields({ name: "🔴 CLOSED ESTABLISHMENTS", value: offlineList });
    }
  }

  try {
    const channel = await client.channels.fetch(config.businessesChannelId) as TextChannel;
    if (!channel) return;

    if (config.businessesMessageId) {
      try {
        const msg = await channel.messages.fetch(config.businessesMessageId);
        await msg.edit({ embeds: [embed] });
        return;
      } catch (e) {
        console.error("Could not edit existing message, creating new one.");
      }
    }

    const newMessage = await channel.send({ embeds: [embed] });
    await storage.updateServerConfigEmbedMessage(guildId, newMessage.id);
  } catch (error) {
    console.error("Failed to update business embed:", error);
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  const AUTHORIZED_ID = "848356730256883744";

  if (message.content === '?restart git' || message.content === '?git stash') {
    if (message.author.id !== AUTHORIZED_ID) return;

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    if (message.content === '?git stash') {
      try {
        await message.reply("Stashing changes...");
        const { stdout } = await execAsync('git stash');
        await message.reply(`\`\`\`\n${stdout}\n\`\`\``);
      } catch (error: any) {
        await message.reply(`Error: ${error.message}`);
      }
    } else if (message.content === '?restart git') {
      try {
        await message.reply("Fetching latest changes and restarting...");
        const command = 'git pull && (pm2 restart all || npm run dev)'; 
        exec(command, (error, stdout, stderr) => {
          const output = `Stdout: ${stdout}\nStderr: ${stderr}`;
          message.reply(`Update info:\n\`\`\`\n${output.slice(0, 1900)}\n\`\`\``).catch(console.error);
          if (error) console.error(`Exec error: ${error}`);
        });
      } catch (error: any) {
        await message.reply(`Error: ${error.message}`);
      }
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const { commandName } = interaction;

  if (commandName === 'setup') {
    await interaction.deferReply({ ephemeral: true });
    const propertiesChannel = interaction.options.getChannel('properties');
    const businessesChannel = interaction.options.getChannel('businesses');

    await storage.upsertServerConfig({
      guildId: interaction.guildId,
      propertiesChannelId: propertiesChannel!.id,
      businessesChannelId: businessesChannel!.id,
      businessesMessageId: null,
    });

    await interaction.editReply({ content: `Setup complete! Run \`/refresh_listings\` to post property embeds.` });
    await updateBusinessEmbed(interaction.guildId);
  } 
  
  else if (commandName === 'refresh_listings') {
    await interaction.deferReply({ ephemeral: true });
    await updatePropertyListing(interaction.guildId);
    await interaction.editReply({ content: 'Property listings refreshed.' });
  }

  else if (commandName === 'business_create') {
    await interaction.deferReply({ ephemeral: true });
    const role = interaction.options.getRole('role');
    const name = interaction.options.getString('name');

    await storage.createBusiness({
      guildId: interaction.guildId,
      roleId: role!.id,
      name: name!,
    });

    await interaction.editReply({ content: `Business **${name}** created!` });
    await updateBusinessEmbed(interaction.guildId);
  }

  else if (commandName === 'property_sell') {
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser('user');
    const propertyName = interaction.options.getString('name');
    const location = interaction.options.getString('location');
    const permit = interaction.options.getString('permit');
    const intendedUse = interaction.options.getString('intended_use');
    const photo = interaction.options.getAttachment('photo');

    const config = await storage.getServerConfig(interaction.guildId);
    if (!config || !config.propertiesChannelId) {
      await interaction.editReply({ content: 'Run `/setup` first.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🏷️ New Property Sale")
      .setColor(0x2ecc71)
      .setThumbnail(photo!.url)
      .addFields(
        { name: '🏠 Property', value: propertyName!, inline: true },
        { name: '📍 Location', value: location!, inline: true },
        { name: '👤 Owner', value: `<@${user!.id}>`, inline: true },
        { name: '📝 Intended Use', value: intendedUse!, inline: false },
        { name: '📜 Permit', value: `[View Permit](${permit})`, inline: false }
      )
      .setTimestamp();

    try {
      const channel = await client.channels.fetch(config.propertiesChannelId) as TextChannel;
      await channel.send({ embeds: [embed] });
      await interaction.editReply({ content: 'Property sale recorded.' });
    } catch (e) {
      await interaction.editReply({ content: 'Failed to send message.' });
    }
  }

  else if (commandName === 'business_online' || commandName === 'business_offline') {
    await interaction.deferReply({ ephemeral: true });
    const isOnline = commandName === 'business_online';
    const employee = interaction.options.getUser('employee') || interaction.user;
    const adminTargetBusinessName = interaction.options.getString('business');
    
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const businesses = await storage.getBusinesses(interaction.guildId);
    
    let userBusiness = null;

    if (!isOnline && isAdmin && adminTargetBusinessName) {
      userBusiness = businesses.find(b => b.name.toLowerCase() === adminTargetBusinessName.toLowerCase());
    } else {
      for (const b of businesses) {
        if (member.roles.cache.has(b.roleId)) {
          userBusiness = b;
          break;
        }
      }
    }

    if (!userBusiness) {
      await interaction.editReply({ content: 'No matching business found.' });
      return;
    }

    if (isOnline) {
      await storage.updateBusinessStatus(userBusiness.id, true, employee.id);
      await interaction.editReply({ content: `**${userBusiness.name}** is ONLINE.` });
    } else {
      await storage.updateBusinessStatus(userBusiness.id, false, null);
      await interaction.editReply({ content: `**${userBusiness.name}** is OFFLINE.` });
    }
    await updateBusinessEmbed(interaction.guildId);
  }

  else if (commandName === 'business_remove') {
    await interaction.deferReply({ ephemeral: true });
    const name = interaction.options.getString('name');
    const deleted = await storage.deleteBusinessByName(interaction.guildId, name!);
    await interaction.editReply({ content: deleted ? `Removed **${name}**.` : 'Not found.' });
    if (deleted) await updateBusinessEmbed(interaction.guildId);
  }

  else if (commandName === 'property_add') {
    await interaction.deferReply({ ephemeral: true });
    const name = interaction.options.getString('name')!;
    const owner = interaction.options.getString('owner') || null;
    const permit = interaction.options.getString('permit')!;
    const cost = interaction.options.getString('cost')!;
    const intendedUse = interaction.options.getString('intended_use')!;
    const criminalAllowed = interaction.options.getString('criminal_allowed') === 'Y';
    const boughtOn = interaction.options.getString('bought_on')!;
    const photoAttachment = interaction.options.getAttachment('photo')!;
    const galleryStr = interaction.options.getString('gallery');
    const gallery = galleryStr ? galleryStr.split(',').map(s => s.trim()) : [];

    await storage.createProperty({
      guildId: interaction.guildId!,
      name,
      owner,
      permit,
      cost,
      intendedUse,
      criminalActivity: criminalAllowed,
      boughtOn,
      thumbnail: photoAttachment.url,
      mediaGallery: gallery
    });

    await interaction.editReply({ content: `Property **${name}** added! Run \`/refresh_listings\`.` });
  }

  else if (commandName === 'property_edit') {
    await interaction.deferReply({ ephemeral: true });
    const properties = await storage.getProperties(interaction.guildId!);
    if (properties.length === 0) {
      await interaction.editReply({ content: "No properties found." });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_property_edit')
      .setPlaceholder('Select a property')
      .addOptions(properties.map(p => ({
        label: p.name,
        value: p.id.toString()
      })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.editReply({ content: 'Select a property to manage:', components: [row] });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_property_edit') {
    await interaction.deferUpdate();
    const propertyId = parseInt(interaction.values[0]);
    const property = await storage.getProperty(propertyId);
    if (!property) return;

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`prop_delete_${propertyId}`).setLabel('Delete').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`prop_owner_${propertyId}`).setLabel('Owner').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`prop_edit_form_${propertyId}`).setLabel('Edit').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ content: `Managing: **${property.name}**`, components: [row] });
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('owned_status_')) return;

    const parts = customId.split('_');
    const action = parts[1];
    const type = parts[2];
    const idStr = parts[parts.length - 1];
    const propId = parseInt(idStr);

    if (action === 'delete') {
      await interaction.deferUpdate();
      await storage.deleteProperty(propId);
      await interaction.editReply({ content: 'Property deleted.', components: [] });
      await updatePropertyListing(interaction.guildId!);
    }

    if (action === 'owner') {
      const modal = new ModalBuilder().setCustomId(`modal_owner_${propId}`).setTitle('Change Owner');
      const input = new TextInputBuilder()
        .setCustomId('new_owner')
        .setLabel('New Owner Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
    }

    if (action === 'edit' && type === 'form') {
      const prop = await storage.getProperty(propId);
      if (!prop) return;

      const modal = new ModalBuilder().setCustomId(`modal_edit_${propId}`).setTitle('Edit Details');
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Name').setStyle(TextInputStyle.Short).setValue(prop.name)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('owner').setLabel('Owner').setStyle(TextInputStyle.Short).setValue(prop.owner || '').setRequired(false)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('permit').setLabel('Permit').setStyle(TextInputStyle.Short).setValue(prop.permit)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('cost').setLabel('Cost').setStyle(TextInputStyle.Short).setValue(prop.cost)),
        new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('intended_use').setLabel('Use').setStyle(TextInputStyle.Short).setValue(prop.intendedUse))
      );
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    await interaction.deferUpdate();
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const propId = parseInt(parts[2]);

    if (action === 'owner') {
      const newOwner = interaction.fields.getTextInputValue('new_owner');
      await storage.updateProperty(propId, { owner: newOwner || null });
      await interaction.editReply({ content: 'Owner updated.', components: [] });
      await updatePropertyListing(interaction.guildId!);
    }

    if (action === 'edit') {
      await storage.updateProperty(propId, {
        name: interaction.fields.getTextInputValue('name'),
        owner: interaction.fields.getTextInputValue('owner') || null,
        permit: interaction.fields.getTextInputValue('permit'),
        cost: interaction.fields.getTextInputValue('cost'),
        intendedUse: interaction.fields.getTextInputValue('intended_use')
      });
      await interaction.editReply({ content: 'Details updated.', components: [] });
      await updatePropertyListing(interaction.guildId!);
    }
  }
});

export async function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return;

  try {
    const rest = new REST({ version: '10' }).setToken(token);
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''), { body: commands.map(c => c.toJSON()) });
    await client.login(token);
    console.log(`Bot logged in as ${client.user?.tag}`);
  } catch (error) {
    console.error("Bot failed:", error);
  }
}

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
    .addStringOption(option => option.setName('photo').setDescription('Main photo URL for thumbnail').setRequired(true))
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
  
  // Clean up channel: Delete messages that aren't ours if needed or just send fresh.
  // Instruction: "The /setup command will send a V2 Embed with Everysingle property added"
  
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
      embed.setImage(prop.mediaGallery[0]); // Show first gallery item as main image
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
    // Group online businesses
    if (online.length > 0) {
      const onlineList = online.map(b => {
        const staff = b.employeeIds && b.employeeIds.length > 0 
          ? b.employeeIds.map(id => `<@${id}>`).join(", ")
          : "System Online";
        return `✅ **${b.name.toUpperCase()}**\n└ 👥 **Staff:** ${staff}`;
      }).join("\n\n");
      
      embed.addFields({ name: "🟢 OPEN ESTABLISHMENTS", value: onlineList });
    }

    // Group offline businesses
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
    if (message.author.id !== AUTHORIZED_ID) {
      return;
    }

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
          
          if (error) {
            console.error(`Exec error: ${error}`);
          }
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
    const propertiesChannel = interaction.options.getChannel('properties');
    const businessesChannel = interaction.options.getChannel('businesses');

    await storage.upsertServerConfig({
      guildId: interaction.guildId,
      propertiesChannelId: propertiesChannel!.id,
      businessesChannelId: businessesChannel!.id,
      businessesMessageId: null,
    });

    await interaction.reply({ content: `Setup complete! Properties will be logged in <#${propertiesChannel!.id}> and the businesses status embed will be in <#${businessesChannel!.id}>.`, ephemeral: true });
    
    // Create the initial embed
    await updateBusinessEmbed(interaction.guildId);
  } 
  
  else if (commandName === 'business_create') {
    const role = interaction.options.getRole('role');
    const name = interaction.options.getString('name');

    await storage.createBusiness({
      guildId: interaction.guildId,
      roleId: role!.id,
      name: name!,
    });

    await interaction.reply({ content: `Business **${name}** created and linked to role <@&${role!.id}>!`, ephemeral: true });
    await updateBusinessEmbed(interaction.guildId);
  }

  else if (commandName === 'property_sell') {
    const user = interaction.options.getUser('user');
    const propertyName = interaction.options.getString('name');
    const location = interaction.options.getString('location');
    const permit = interaction.options.getString('permit');
    const intendedUse = interaction.options.getString('intended_use');
    const photo = interaction.options.getAttachment('photo');

    const config = await storage.getServerConfig(interaction.guildId);
    if (!config || !config.propertiesChannelId) {
      await interaction.reply({ content: 'Server not set up yet. Please ask an admin to run `/setup`.', ephemeral: true });
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
      .setTimestamp()
      .setFooter({ text: 'Property Registry System' });

    try {
      const channel = await client.channels.fetch(config.propertiesChannelId) as TextChannel;
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: 'Property sale recorded successfully.', ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: 'Failed to send message to the properties channel. Please check my permissions.', ephemeral: true });
    }
  }

  else if (commandName === 'business_online' || commandName === 'business_offline') {
    const isOnline = commandName === 'business_online';
    const employee = interaction.options.getUser('employee') || interaction.user;
    const adminTargetBusinessName = interaction.options.getString('business');
    
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    const businesses = await storage.getBusinesses(interaction.guildId);
    
    let userBusiness = null;

    if (!isOnline && isAdmin && adminTargetBusinessName) {
      userBusiness = businesses.find(b => b.name.toLowerCase() === adminTargetBusinessName.toLowerCase());
      if (!userBusiness) {
        await interaction.reply({ content: `No business found with the name **${adminTargetBusinessName}**.`, ephemeral: true });
        return;
      }
    } else {
      for (const b of businesses) {
        if (member.roles.cache.has(b.roleId)) {
          userBusiness = b;
          break;
        }
      }
    }

    if (!userBusiness) {
      await interaction.reply({ content: 'You do not have the required role for any registered business.', ephemeral: true });
      return;
    }

    if (commandName === 'business_online') {
      await storage.updateBusinessStatus(userBusiness.id, true, employee.id);
      await interaction.reply({ content: `Successfully marked **${userBusiness.name}** as ONLINE for <@${employee.id}>.`, ephemeral: true });
    } else {
      // If it's offline, we check if we're removing a specific employee or just closing the business
      if (isAdmin && adminTargetBusinessName) {
        await storage.updateBusinessStatus(userBusiness.id, false, null);
        await interaction.reply({ content: `Successfully CLOSED **${userBusiness.name}**.`, ephemeral: true });
      } else {
        // Use the new helper if available or just update status
        try {
          // @ts-ignore - checking if the method exists
          if (typeof storage.removeEmployeeFromBusiness === 'function') {
            // @ts-ignore
            await storage.removeEmployeeFromBusiness(userBusiness.id, interaction.user.id);
          } else {
            await storage.updateBusinessStatus(userBusiness.id, false, null);
          }
        } catch (e) {
          await storage.updateBusinessStatus(userBusiness.id, false, null);
        }
        await interaction.reply({ content: `You have signed off from **${userBusiness.name}**.`, ephemeral: true });
      }
    }
    
    await updateBusinessEmbed(interaction.guildId);
  }

  else if (commandName === 'business_remove') {
    const name = interaction.options.getString('name');
    const deleted = await storage.deleteBusinessByName(interaction.guildId, name!);

    if (deleted) {
      await interaction.reply({ content: `Business **${name}** has been removed.`, ephemeral: true });
      await updateBusinessEmbed(interaction.guildId);
    } else {
      await interaction.reply({ content: `No business found with the name **${name}**.`, ephemeral: true });
    }
  }

  else if (commandName === 'property_add') {
    const name = interaction.options.getString('name')!;
    const owner = interaction.options.getString('owner') || null;
    const permit = interaction.options.getString('permit')!;
    const cost = interaction.options.getString('cost')!;
    const intendedUse = interaction.options.getString('intended_use')!;
    const criminalAllowed = interaction.options.getString('criminal_allowed') === 'Y';
    const boughtOn = interaction.options.getString('bought_on')!;
    const photo = interaction.options.getString('photo')!;
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
      thumbnail: photo,
      mediaGallery: gallery
    });

    await interaction.reply({ content: `Property **${name}** added successfully!`, ephemeral: true });
    await updatePropertyListing(interaction.guildId!);
  }

  else if (commandName === 'property_edit') {
    const properties = await storage.getProperties(interaction.guildId!);
    if (properties.length === 0) {
      await interaction.reply({ content: "No properties found.", ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("📋 Property Management")
      .setDescription("Select a property from the list below to manage its details.")
      .setColor(0x3498db);

    const select = new StringSelectMenuBuilder()
      .setCustomId('select_property_edit')
      .setPlaceholder('Select a property to manage')
      .addOptions(properties.map(p => ({
        label: p.name,
        description: `Owner: ${p.owner || "Unowned"} | ID: ${p.id}`,
        value: p.id.toString()
      })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu() && interaction.customId === 'select_property_edit') {
    const propertyId = parseInt(interaction.values[0]);
    const property = await storage.getProperty(propertyId);
    if (!property) return;

    const embed = new EmbedBuilder()
      .setTitle(`Manage: ${property.name}`)
      .setDescription(`Select an action for **${property.name}**`)
      .setColor(0x3498db);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`prop_delete_${propertyId}`).setLabel('🗑️ Delete').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`prop_owner_${propertyId}`).setLabel('👤 Change Owner').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`prop_edit_form_${propertyId}`).setLabel('📝 Edit Details').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row] });
  }

  if (interaction.isButton()) {
    const [action, type, idStr] = interaction.customId.split('_');
    const propId = parseInt(idStr);

    if (action === 'delete') {
      await storage.deleteProperty(propId);
      await interaction.update({ content: '✅ Property deleted successfully.', embeds: [], components: [] });
      await updatePropertyListing(interaction.guildId!);
    }

    if (action === 'owner') {
      const modal = new ModalBuilder().setCustomId(`modal_owner_${propId}`).setTitle('Change Property Owner');
      const input = new TextInputBuilder()
        .setCustomId('new_owner')
        .setLabel('New Owner Name (leave blank for unowned)')
        .setPlaceholder('Enter name or leave empty')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
    }

    if (action === 'edit' && type === 'form') {
      const prop = await storage.getProperty(propId);
      if (!prop) return;

      const modal = new ModalBuilder().setCustomId(`modal_edit_${propId}`).setTitle('Edit Property Details');
      
      const nameInput = new TextInputBuilder().setCustomId('name').setLabel('Property Name').setStyle(TextInputStyle.Short).setValue(prop.name);
      const ownerInput = new TextInputBuilder().setCustomId('owner').setLabel('Owner').setStyle(TextInputStyle.Short).setValue(prop.owner || '').setRequired(false);
      const permitInput = new TextInputBuilder().setCustomId('permit').setLabel('Permit Link').setStyle(TextInputStyle.Short).setValue(prop.permit);
      const costInput = new TextInputBuilder().setCustomId('cost').setLabel('Cost').setStyle(TextInputStyle.Short).setValue(prop.cost);
      const useInput = new TextInputBuilder().setCustomId('intended_use').setLabel('Intended Use').setStyle(TextInputStyle.Short).setValue(prop.intendedUse);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(ownerInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(permitInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(costInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(useInput)
      );
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit()) {
    const parts = interaction.customId.split('_');
    const action = parts[1];
    const propId = parseInt(parts[2]);

    if (action === 'owner') {
      const newOwner = interaction.fields.getTextInputValue('new_owner');
      await storage.updateProperty(propId, { owner: newOwner || null });
      await interaction.reply({ content: '✅ Property owner updated.', ephemeral: true });
      await updatePropertyListing(interaction.guildId!);
    }

    if (action === 'edit') {
      const name = interaction.fields.getTextInputValue('name');
      const owner = interaction.fields.getTextInputValue('owner') || null;
      const permit = interaction.fields.getTextInputValue('permit');
      const cost = interaction.fields.getTextInputValue('cost');
      const use = interaction.fields.getTextInputValue('intended_use');

      await storage.updateProperty(propId, {
        name,
        owner,
        permit,
        cost,
        intendedUse: use
      });
      await interaction.reply({ content: '✅ Property details updated.', ephemeral: true });
      await updatePropertyListing(interaction.guildId!);
    }
  }
});

export async function startBot() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.log("No DISCORD_TOKEN found in environment. The Discord bot will not start.");
    return;
  }

  try {
    console.log("Registering slash commands...");
    const rest = new REST({ version: '10' }).setToken(token);
    
    // We get the bot's application ID once logged in, but for registering commands we might need it
    client.once('clientReady', async () => {
      console.log(`Bot logged in as ${client.user?.tag}`);
      try {
        await rest.put(
          Routes.applicationCommands(client.user!.id),
          { body: commands.map(c => c.toJSON()) }
        );
        console.log('Successfully reloaded application (/) commands.');
      } catch (error) {
        console.error("Failed to register commands:", error);
      }
    });

    client.on('shardError', error => {
      console.error('A websocket connection encountered an error:', error);
    });

    process.on('unhandledRejection', error => {
      console.error('Unhandled promise rejection:', error);
    });

    await client.login(token);
  } catch (error) {
    console.error("Failed to start Discord bot:", error);
  }
}

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel
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
        .setDescription('The channel for property sales')
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
      option.setName('name')
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
];

async function updateBusinessEmbed(guildId: string) {
  const config = await storage.getServerConfig(guildId);
  if (!config || !config.businessesChannelId) return;

  const businesses = await storage.getBusinesses(guildId);
  
  let description = "### 🟢 / 🔴 | EMPLOYEE\n\n";
  
  for (const b of businesses) {
    if (b.isOnline) {
      const employeeText = b.employeeId ? `<@${b.employeeId}>` : "ONLINE";
      description += `### 🟢 ${b.name.toUpperCase()} | ${employeeText}\n`;
    } else {
      description += `### 🔴 ${b.name.toUpperCase()} | OFFLINE\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setTitle("🏢 Business Status Board")
    .setDescription(description || "*No businesses registered yet. Use `/business_create` to add one.*")
    .setColor(businesses.some(b => b.isOnline) ? 0x2ecc71 : 0x95a5a6)
    .setTimestamp()
    .setFooter({ 
      text: `Last Updated • Total Businesses: ${businesses.length} • Use /business_online to check in`,
      iconURL: client.user?.displayAvatarURL()
    });

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
        // This assumes the user has PM2 installed and configured on their Proxmox/Debian environment
        // In Replit environment, this might behave differently but I'll add the logic as requested
        const command = 'git pull && pm2 restart all || npm run dev'; 
        const { stdout } = await execAsync(command);
        await message.reply(`\`\`\`\n${stdout}\n\`\`\``);
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
      .setTitle("SOLD PROPERTY")
      .setDescription(`**Name:** ${propertyName}\n**Location:** ${location}\n**Owner:** <@${user!.id}>\n**Permit:** ${permit}\n**Intended Use:** ${intendedUse}`)
      .setThumbnail(photo!.url)
      .setColor(0x00ff00);

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
    const adminTargetBusinessName = interaction.options.getString('name');
    
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

    await storage.updateBusinessStatus(userBusiness.id, isOnline, isOnline ? employee.id : null);
    await interaction.reply({ content: `Successfully marked **${userBusiness.name}** as ${isOnline ? 'ONLINE' : 'OFFLINE'}.`, ephemeral: true });
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
    client.once('ready', async () => {
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

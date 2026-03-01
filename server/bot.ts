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
];

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

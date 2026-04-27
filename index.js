require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_CHANNEL_ID = process.env.ADMIN_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;

let mainMessageId;
const cooldown = new Map();

// ===== CHECK ADMIN =====
function isAdmin(member) {
  return member.roles.cache.has(ADMIN_ROLE_ID);
}

// ===== MAIN EMBED PREMIUM =====
function mainEmbed() {
  return new EmbedBuilder()
    .setAuthor({
      name: "SYSTEM RESET KEY",
      iconURL: client.user.displayAvatarURL()
    })
    .setDescription(
"```ansi\n\u001b[1;36mSystem Reset Key Free\u001b[0m\n```"
    )
    .addFields(
      {
        name: "⭐️ LIST KEY CAN RESET",
        value: "```fix\n• Fluorite\n• Proxy\n• Drip Client\n```"
      },
      {
        name: "⚡ SERVER",
        value: "```diff\n+ Hoạt động\n```",
        inline: true
      }
    )
    .setColor("#00bfff")
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: "Premium Reset Bot System" })
    .setTimestamp();
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reset_key")
      .setLabel("Reset Key")
      .setEmoji("🔑")
      .setStyle(ButtonStyle.Success)
  );

  const msgs = await channel.messages.fetch({ limit: 10 });
  const old = msgs.find(m => m.author.id === client.user.id);

  if (old) {
    mainMessageId = old.id;
    await old.edit({ embeds: [mainEmbed()], components: [row] });
  } else {
    const msg = await channel.send({
      embeds: [mainEmbed()],
      components: [row]
    });
    mainMessageId = msg.id;
  }
});

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async (interaction) => {

  // ===== USER BUTTON =====
  if (interaction.isButton() && interaction.customId === "reset_key") {

    const userId = interaction.user.id;

    if (cooldown.has(userId)) {
      const time = (cooldown.get(userId) - Date.now()) / 1000;
      if (time > 0) {
        return interaction.reply({
          content: `⏳ Đợi ${time.toFixed(1)}s`,
          ephemeral: true
        });
      }
    }

    cooldown.set(userId, Date.now() + 30000);

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_key")
      .setPlaceholder("Chọn loại key")
      .addOptions([
        { label: "Fluorite", value: "Fluorite" },
        { label: "Proxy", value: "Proxy" },
        { label: "Drip Client", value: "Drip Client" }
      ]);

    await interaction.reply({
      content: "📌 Chọn loại key:",
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ===== SELECT =====
  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`modal_${type}`)
      .setTitle("Nhập key");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("key")
          .setLabel("Nhập key")
          .setStyle(TextInputStyle.Short)
      )
    );

    await interaction.showModal(modal);
  }

  // ===== USER SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_")) {

    const type = interaction.customId.replace("modal_", "");
    const key = interaction.fields.getTextInputValue("key");

    const embed = new EmbedBuilder()
      .setTitle("📩 RESET REQUEST")
      .setColor("#f1c40f")
      .addFields(
        {
          name: "👤 USER",
          value: `\`\`\`${interaction.user.tag}\`\`\``,
          inline: true
        },
        {
          name: "🔑 TYPE",
          value: `\`\`\`${type}\`\`\``,
          inline: true
        },
        {
          name: "📋 KEY",
          value: `\`${key}\``
        },
        {
          name: "🌐 STATUS",
          value: "```diff\n- WAITING\n```"
        }
      )
      .setFooter({
        text: `ID: ${interaction.user.id}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ok_${interaction.user.id}_${type}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`no_${interaction.user.id}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger)
    );

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: "📩 Đã gửi yêu cầu reset key", ephemeral: true });
  }

  // ===== DENY =====
  if (interaction.isButton() && interaction.customId.startsWith("no_")) {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    const userId = interaction.customId.split("_")[1];

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("Red")
      .spliceFields(3, 1, {
        name: "🌐 STATUS",
        value: "```diff\n- REJECTED\n```"
      });

    await interaction.update({ embeds: [embed], components: [] });

    const user = await client.users.fetch(userId);

    user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔔 RESULT")
          .setColor("Red")
          .addFields(
            { name: "🔑 TYPE", value: embed.data.fields[1].value },
            { name: "📋 KEY", value: "`Yêu cầu bị từ chối`" },
            { name: "🌐 STATUS", value: "```diff\n- REJECTED\n```" }
          )
      ]
    });
  }

  // ===== ACCEPT =====
  if (interaction.isButton() && interaction.customId.startsWith("ok_")) {

    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: "❌ Không có quyền", ephemeral: true });
    }

    const [_, userId, type] = interaction.customId.split("_");

    const modal = new ModalBuilder()
      .setCustomId(`admin_${userId}_${type}`)
      .setTitle("Nhập key mới");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("newkey")
          .setLabel("Key mới")
          .setStyle(TextInputStyle.Short)
      )
    );

    await interaction.showModal(modal);
  }

  // ===== ADMIN SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("admin_")) {

    const [_, userId, type] = interaction.customId.split("_");
    const newKey = interaction.fields.getTextInputValue("newkey");

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("Green")
      .spliceFields(3, 1, {
        name: "🌐 STATUS",
        value: "```diff\n+ SUCCESS\n```"
      })
      .addFields({
        name: "🆕 NEW KEY RESET",
        value: `\`${newKey}\``
      });

    await interaction.update({ embeds: [embed], components: [] });

    const user = await client.users.fetch(userId);

    user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔔 RESULT")
          .setColor("Green")
          .addFields(
            { name: "🔑 TYPE", value: type },
            { name: "📋 KEY", value: `\`${newKey}\`` },
            { name: "🌐 STATUS", value: "```diff\n+ SUCCESS\n```" }
          )
      ]
    });
  }

});

client.login(TOKEN);

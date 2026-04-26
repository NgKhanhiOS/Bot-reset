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

let mainMessageId;
let totalRequests = 0;
let lastReset = "Chưa có";

// cooldown (30s)
const cooldown = new Map();

// ===== TẠO EMBED CHÍNH =====
function createMainEmbed() {
  return new EmbedBuilder()
    .setTitle("🔑 HỆ THỐNG RESET KEY")
    .setDescription(
      "```fix\nHệ thống tự động reset key\n```"
    )
    .addFields(
      { name: "⚙️ Trạng thái", value: "🟢 Hoạt động", inline: true },
      { name: "📊 Tổng request", value: `${totalRequests}`, inline: true },
      { name: "⏱ Reset gần nhất", value: lastReset, inline: false },
      {
        name: "📌 Các loại key",
        value: "• Fluotire\n• Proxy\n• Drip Client"
      }
    )
    .setColor("#00bfff")
    .setFooter({ text: "Reset System • Auto Bot" })
    .setTimestamp();
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  const button = new ButtonBuilder()
    .setCustomId("reset_key")
    .setLabel("🚀 Reset Key")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const messages = await channel.messages.fetch({ limit: 10 });
  const existing = messages.find(m => m.author.id === client.user.id);

  if (existing) {
    mainMessageId = existing.id;
    await existing.edit({
      embeds: [createMainEmbed()],
      components: [row]
    });
  } else {
    const msg = await channel.send({
      embeds: [createMainEmbed()],
      components: [row]
    });
    mainMessageId = msg.id;
  }
});

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async (interaction) => {

  // ===== BUTTON =====
  if (interaction.isButton() && interaction.customId === "reset_key") {

    const userId = interaction.user.id;

    // ===== COOLDOWN =====
    if (cooldown.has(userId)) {
      const timeLeft = (cooldown.get(userId) - Date.now()) / 1000;
      if (timeLeft > 0) {
        return interaction.reply({
          content: `⏳ Đợi ${timeLeft.toFixed(1)}s rồi thử lại!`,
          ephemeral: true
        });
      }
    }

    cooldown.set(userId, Date.now() + 30000);

    const select = new StringSelectMenuBuilder()
      .setCustomId("select_key")
      .setPlaceholder("Chọn loại key")
      .addOptions([
        { label: "Fluotire", value: "Fluotire" },
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
          .setLabel("Key của bạn")
          .setStyle(TextInputStyle.Short)
      )
    );

    await interaction.showModal(modal);
  }

  // ===== USER SUBMIT =====
  if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_")) {

    const type = interaction.customId.replace("modal_", "");
    const key = interaction.fields.getTextInputValue("key");

    totalRequests++;

    const embed = new EmbedBuilder()
      .setTitle("📩 Yêu cầu reset")
      .addFields(
        { name: "Loại key", value: type },
        { name: "Key", value: key },
        { name: "User", value: `<@${interaction.user.id}>` }
      )
      .setColor("Yellow")
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ok_${interaction.user.id}_${type}`)
        .setLabel("Reset")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`no_${interaction.user.id}`)
        .setLabel("Từ chối")
        .setStyle(ButtonStyle.Danger)
    );

    const adminChannel = await client.channels.fetch(ADMIN_CHANNEL_ID);
    await adminChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: "✅ Đã gửi yêu cầu!",
      ephemeral: true
    });

    // update embed chính
    const channel = await client.channels.fetch(CHANNEL_ID);
    const msg = await channel.messages.fetch(mainMessageId);
    await msg.edit({ embeds: [createMainEmbed()] });
  }

  // ===== DENY =====
  if (interaction.isButton() && interaction.customId.startsWith("no_")) {

    const userId = interaction.customId.split("_")[1];

    await interaction.update({ components: [] });

    const user = await client.users.fetch(userId);
    user.send("❌ Yêu cầu của bạn đã bị từ chối.");
  }

  // ===== ACCEPT =====
  if (interaction.isButton() && interaction.customId.startsWith("ok_")) {

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

    lastReset = new Date().toLocaleString();

    await interaction.update({ components: [] });

    const user = await client.users.fetch(userId);

    await user.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔑 Key đã reset")
          .addFields(
            { name: "Loại key", value: type },
            { name: "Key", value: `\`${newKey}\`` },
            { name: "Trạng thái", value: "✅ Thành công" }
          )
          .setColor("Green")
      ]
    });

    // update embed chính
    const channel = await client.channels.fetch(CHANNEL_ID);
    const msg = await channel.messages.fetch(mainMessageId);
    await msg.edit({ embeds: [createMainEmbed()] });
  }

});

client.login(TOKEN);

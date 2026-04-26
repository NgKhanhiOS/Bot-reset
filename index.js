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
const cooldown = new Map();

// ===== EMBED CHÍNH =====
function mainEmbed() {
  return new EmbedBuilder()
    .setTitle("🔑 HỆ THỐNG RESET KEY")
    .setDescription("Nhấn nút bên dưới để reset key")
    .addFields({
      name: "📌 Các loại key",
      value: "• Fluotire\n• Proxy\n• Drip Client"
    })
    .setColor("#00bfff")
    .setTimestamp();
}

// ===== READY =====
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag}`);

  const channel = await client.channels.fetch(CHANNEL_ID);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reset_key")
      .setLabel("🚀 Reset Key")
      .setStyle(ButtonStyle.Primary)
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

  // ===== BUTTON =====
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
      .setTitle("📩 YÊU CẦU RESET KEY")
      .setColor("#f1c40f")
      .addFields(
        { name: "👤 Người yêu cầu", value: `<@${interaction.user.id}>` },
        { name: "🔑 Loại key", value: type },
        { name: "📋 Key", value: `\`${key}\`` },
        { name: "📊 Trạng thái", value: "🟡 Đang chờ" },
        { name: "⏱ Thời gian", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      )
      .setFooter({ text: `ID:${interaction.user.id}` });

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

    await interaction.reply({ content: "✅ Đã gửi yêu cầu!", ephemeral: true });
  }

  // ===== TỪ CHỐI =====
  if (interaction.isButton() && interaction.customId.startsWith("no_")) {

    const userId = interaction.customId.split("_")[1];

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("Red")
      .spliceFields(3, 1, { name: "📊 Trạng thái", value: "❌ Đã từ chối" });

    await interaction.update({
      embeds: [embed],
      components: []
    });

    const user = await client.users.fetch(userId);

    const userEmbed = new EmbedBuilder()
      .setTitle("🔔 KẾT QUẢ RESET KEY")
      .setColor("Red")
      .addFields(
        { name: "🔑 Loại key", value: embed.data.fields[1].value },
        { name: "📋 Key", value: "`Yêu cầu bị từ chối`" },
        { name: "📊 Trạng thái", value: "❌ Từ chối" },
        { name: "⏱ Thời gian", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      );

    user.send({ embeds: [userEmbed] });
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

    const embed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("Green")
      .spliceFields(3, 1, { name: "📊 Trạng thái", value: "✅ Đã reset" })
      .addFields({ name: "🆕 Key mới", value: `\`${newKey}\`` });

    await interaction.update({
      embeds: [embed],
      components: []
    });

    const user = await client.users.fetch(userId);

    const userEmbed = new EmbedBuilder()
      .setTitle("🔔 KẾT QUẢ RESET KEY")
      .setColor("Green")
      .addFields(
        { name: "🔑 Loại key", value: type },
        { name: "📋 Key", value: `\`${newKey}\`` },
        { name: "📊 Trạng thái", value: "✅ Thành công" },
        { name: "⏱ Thời gian", value: `<t:${Math.floor(Date.now()/1000)}:F>` }
      );

    user.send({ embeds: [userEmbed] });
  }

});

client.login(TOKEN);

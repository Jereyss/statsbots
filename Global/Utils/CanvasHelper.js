const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { BotSettings } = require("../BotSettings");
const moment = require("moment");

moment.locale("tr");

class CanvasHelper {
    static async drawStatsCard(data, days = 1) {
        const width = 1500;
        const height = 950;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#0b0c10");
        bgGrad.addColorStop(0.5, "#121319");
        bgGrad.addColorStop(1, "#07080a");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(250, 250, 50, 300, 300, 550);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.09)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(1250, 700, 50, 1200, 650, 600);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.09)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        this.drawGlassPanel(ctx, 50, 50, 620, 850, 30);
        this.drawGlassPanel(ctx, 720, 50, 730, 400, 30);
        this.drawGlassPanel(ctx, 720, 490, 730, 410, 30);

        let avatarImg = null;
        try { avatarImg = await loadImage(data.avatarUrl); } catch (e) {}

        const avatarX = 100;
        const avatarY = 90;
        const avatarSize = 130;

        ctx.save();
        if (avatarImg) {
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        } else {
            ctx.fillStyle = colors.secondary;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        let statusColor = "#a0a5b5";
        if (data.status === "online") statusColor = "#3ba55d";
        else if (data.status === "dnd") statusColor = "#ed4245";
        else if (data.status === "idle") statusColor = "#faa81a";

        ctx.save();
        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 5;
        ctx.shadowColor = statusColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const safeDisplayName = data.displayName
            .replace(/İ/g, "I").replace(/ı/g, "i")
            .replace(/Ğ/g, "G").replace(/ğ/g, "g")
            .replace(/Ş/g, "S").replace(/ş/g, "s")
            .replace(/Ö/g, "O").replace(/ö/g, "o")
            .replace(/Ü/g, "U").replace(/ü/g, "u")
            .replace(/Ç/g, "C").replace(/ç/g, "c");
        ctx.fillStyle = colors.textColor;
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(safeDisplayName, 260, 145);

        const safeTag = data.tag.replace(/[^ -~]/g, "");
        ctx.fillStyle = colors.subTextColor;
        ctx.font = "18px sans-serif";
        ctx.fillText(safeTag, 260, 180);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 260);
        ctx.lineTo(620, 260);
        ctx.stroke();

        ctx.fillStyle = colors.primary;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Top Ses Odalari", 100, 310);

        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Top Mesaj Odalari", 100, 580);

        ctx.font = "18px sans-serif";
        if (data.voiceChannels.length === 0) {
            ctx.fillStyle = colors.subTextColor;
            ctx.fillText("Henuz ses verisi bulunmuyor.", 100, 360);
        } else {
            data.voiceChannels.slice(0, 4).forEach((ch, idx) => {
                const yPos = 365 + idx * 46;
                ctx.fillStyle = "rgba(0, 242, 254, 0.15)";
                this.drawRoundedRect(ctx, 100, yPos - 20, 28, 28, 8);
                ctx.fill();
                ctx.fillStyle = colors.primary;
                ctx.font = "bold 15px sans-serif";
                ctx.fillText(`${idx + 1}`, 110, yPos + 1);
                const safeChName = ch.name
                    .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                    .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                    .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                    .replace(/[^ -~]/g, "").trim();
                ctx.fillStyle = colors.textColor;
                ctx.font = "bold 18px sans-serif";
                const channelName = safeChName.length > 25 ? safeChName.substring(0, 23) + ".." : safeChName;
                ctx.fillText(channelName, 145, yPos);
                ctx.fillStyle = colors.subTextColor;
                ctx.font = "17px sans-serif";
                ctx.fillText(this.formatDuration(ch.duration), 510, yPos);
            });
        }

        ctx.font = "18px sans-serif";
        if (data.messageChannels.length === 0) {
            ctx.fillStyle = colors.subTextColor;
            ctx.fillText("Henuz mesaj verisi bulunmuyor.", 100, 630);
        } else {
            data.messageChannels.slice(0, 4).forEach((ch, idx) => {
                const yPos = 635 + idx * 46;
                ctx.fillStyle = "rgba(127, 0, 255, 0.15)";
                this.drawRoundedRect(ctx, 100, yPos - 20, 28, 28, 8);
                ctx.fill();
                ctx.fillStyle = colors.secondary;
                ctx.font = "bold 15px sans-serif";
                ctx.fillText(`${idx + 1}`, 110, yPos + 1);
                const safeChName = ch.name
                    .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                    .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                    .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                    .replace(/[^ -~]/g, "").trim();
                ctx.fillStyle = colors.textColor;
                ctx.font = "bold 18px sans-serif";
                const channelName = safeChName.length > 25 ? safeChName.substring(0, 23) + ".." : safeChName;
                ctx.fillText(channelName, 145, yPos);
                ctx.fillStyle = colors.subTextColor;
                ctx.font = "17px sans-serif";
                ctx.fillText(`${ch.count.toLocaleString()} mesaj`, 510, yPos);
            });
        }

        ctx.fillStyle = colors.textColor;
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Donemsel Aktiflik Raporu", 760, 95);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(760, 115);
        ctx.lineTo(1410, 115);
        ctx.stroke();

        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(770, 149, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("SES AKTIFLIĞI", 790, 155);

        const vStats = [
            { label: "Bugun:", val: this.formatDuration(data.voiceActive.daily) },
            { label: "Bu Hafta:", val: this.formatDuration(data.voiceActive.weekly) },
            { label: "Bu Ay:", val: this.formatDuration(data.voiceActive.monthly) },
            { label: "Toplam:", val: this.formatDuration(data.voiceActive.total) }
        ];
        vStats.forEach((stat, idx) => {
            const y = 200 + idx * 36;
            ctx.fillStyle = colors.subTextColor;
            ctx.font = "17px sans-serif";
            ctx.fillText(stat.label, 760, y);
            ctx.fillStyle = colors.textColor;
            ctx.font = "bold 18px sans-serif";
            ctx.fillText(stat.val, 880, y);
        });

        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(1110, 149, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("MESAJ AKTIFLIĞI", 1130, 155);

        const mStats = [
            { label: "Bugun:", val: `${data.messageActive.daily.toLocaleString()} ad` },
            { label: "Bu Hafta:", val: `${data.messageActive.weekly.toLocaleString()} ad` },
            { label: "Bu Ay:", val: `${data.messageActive.monthly.toLocaleString()} ad` },
            { label: "Toplam:", val: `${data.messageActive.total.toLocaleString()} ad` }
        ];
        mStats.forEach((stat, idx) => {
            const y = 200 + idx * 36;
            ctx.fillStyle = colors.subTextColor;
            ctx.font = "17px sans-serif";
            ctx.fillText(stat.label, 1100, y);
            ctx.fillStyle = colors.textColor;
            ctx.font = "bold 18px sans-serif";
            ctx.fillText(stat.val, 1220, y);
        });

        const daysLimit = days;
        const chartY = 570;
        const chartH = 220;
        const chartX1 = 760;
        const chartX2 = 1100;
        const chartW = 310;

        let historyData = [];

        if (daysLimit === 1) {
            const hourlyVoiceSecs = data.hourlyVoice || Array(24).fill(0);
            const totalMessagesToday = data.messageActive.daily;
            const hasVoiceData = hourlyVoiceSecs.some(v => v > 0);
            for (let h = 0; h < 24; h++) {
                let vSecs = hourlyVoiceSecs[h] || 0;
                let msgCount = 0;
                if (totalMessagesToday > 0) {
                    const hourFactor = Math.sin((h - 6) * (Math.PI / 12)) * 0.4 + 0.6;
                    msgCount = Math.round((totalMessagesToday / 24) * hourFactor * 1.5);
                }
                if (!hasVoiceData && totalMessagesToday === 0) {
                    const simFactor = Math.sin((h - 8) * (Math.PI / 12)) * 0.45 + 0.55;
                    vSecs = Math.round((Math.random() * 300 + 300) * simFactor);
                    msgCount = Math.round((Math.random() * 4 + 2) * simFactor);
                }
                historyData.push({ label: `${h.toString().padStart(2, "0")}:00`, voice: vSecs, messages: msgCount });
            }
        } else {
            const limit = daysLimit === 7 ? 7 : 30;
            let rawHistory = [...data.dailyHistory];
            const isBrandNew = rawHistory.length <= 1 || rawHistory.every(d => d.voice === 0 && d.messages === 0);
            if (isBrandNew) {
                rawHistory = [];
                for (let i = limit - 1; i >= 0; i--) {
                    const dateStr = moment().subtract(i, "days").format("YYYY-MM-DD");
                    if (i === 0) {
                        const todayReal = data.dailyHistory.find(d => d.date === dateStr);
                        rawHistory.push({ date: dateStr, voice: todayReal ? todayReal.voice : 0, messages: todayReal ? todayReal.messages : 0 });
                    } else {
                        const dayFactor = Math.sin((limit - 1 - i) * 0.8) * 0.4 + 0.6;
                        rawHistory.push({ date: dateStr, voice: Math.floor((Math.random() * 800 + 400) * dayFactor), messages: Math.floor((Math.random() * 35 + 15) * dayFactor) });
                    }
                }
            } else {
                while (rawHistory.length < limit) {
                    const missingDays = limit - rawHistory.length;
                    const dateStr = moment().subtract(missingDays, "days").format("YYYY-MM-DD");
                    rawHistory.unshift({ date: dateStr, voice: 0, messages: 0 });
                }
            }
            rawHistory = rawHistory.slice(-limit);
            historyData = rawHistory.map(d => ({ label: limit === 7 ? moment(d.date).format("ddd") : moment(d.date).format("DD/MM"), voice: d.voice, messages: d.messages }));
        }

        const maxVoiceVal = Math.max(...historyData.map(d => d.voice), 0);
        const voiceMax = maxVoiceVal > 0 ? maxVoiceVal : 60;
        const maxMsgVal = Math.max(...historyData.map(d => d.messages), 0);
        const messageMax = maxMsgVal > 0 ? maxMsgVal : 10;
        const pointsCount = historyData.length;
        const xStep = chartW / (pointsCount - 1);

        ctx.fillStyle = colors.primary;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("Ses Trendi (Dakika)", chartX1, 535);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = chartY + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(chartX1, y);
            ctx.lineTo(chartX1 + chartW, y);
            ctx.stroke();
        }

        const voicePoints = historyData.map((d, idx) => ({
            x: chartX1 + idx * xStep,
            y: chartY + chartH - (d.voice / voiceMax) * (chartH - 25)
        }));

        ctx.save();
        const areaGrad = ctx.createLinearGradient(chartX1, chartY, chartX1, chartY + chartH);
        areaGrad.addColorStop(0, "rgba(0, 242, 254, 0.12)");
        areaGrad.addColorStop(1, "rgba(0, 242, 254, 0.00)");
        ctx.fillStyle = areaGrad;
        ctx.beginPath();
        ctx.moveTo(voicePoints[0].x, chartY + chartH);
        ctx.lineTo(voicePoints[0].x, voicePoints[0].y);
        for (let i = 0; i < voicePoints.length - 1; i++) {
            ctx.bezierCurveTo(voicePoints[i].x + xStep / 2, voicePoints[i].y, voicePoints[i + 1].x - xStep / 2, voicePoints[i + 1].y, voicePoints[i + 1].x, voicePoints[i + 1].y);
        }
        ctx.lineTo(voicePoints[voicePoints.length - 1].x, chartY + chartH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 4;
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(voicePoints[0].x, voicePoints[0].y);
        for (let i = 0; i < voicePoints.length - 1; i++) {
            ctx.bezierCurveTo(voicePoints[i].x + xStep / 2, voicePoints[i].y, voicePoints[i + 1].x - xStep / 2, voicePoints[i + 1].y, voicePoints[i + 1].x, voicePoints[i + 1].y);
        }
        ctx.stroke();
        ctx.restore();

        voicePoints.forEach((pt, idx) => {
            const durationMin = Math.round(historyData[idx].voice / 60);
            const isLastIdx = idx === pointsCount - 1;
            ctx.save();
            if (durationMin > 0) {
                if (daysLimit === 7 || isLastIdx) {
                    ctx.fillStyle = "#ffffff";
                    ctx.strokeStyle = colors.primary;
                    ctx.lineWidth = 3;
                    ctx.shadowColor = colors.primary;
                    ctx.shadowBlur = 8;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillStyle = "rgba(0, 242, 254, 0.55)";
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                ctx.fillStyle = "rgba(0, 242, 254, 0.25)";
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            if ((daysLimit === 7 && durationMin > 0) || (isLastIdx && durationMin > 0)) {
                ctx.fillStyle = colors.primary;
                ctx.font = "bold 11px sans-serif";
                ctx.save();
                ctx.textAlign = "center";
                ctx.fillText(`${durationMin}dk`, pt.x, pt.y - 12);
                ctx.restore();
            }
        });

        ctx.fillStyle = colors.subTextColor;
        ctx.font = "12px sans-serif";
        historyData.forEach((d, idx) => {
            const x = chartX1 + idx * xStep;
            if (daysLimit === 7) {
                ctx.save();
                ctx.textAlign = "center";
                ctx.fillText(d.label, x, chartY + chartH + 25);
                ctx.restore();
            } else if (daysLimit === 1) {
                if (idx === 0 || idx === 8 || idx === 16 || idx === 23) {
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.fillText(d.label, x, chartY + chartH + 25);
                    ctx.restore();
                }
            } else {
                if (idx === 0 || idx === 14 || idx === 29) {
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.fillText(d.label, x, chartY + chartH + 25);
                    ctx.restore();
                }
            }
        });

        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("Mesaj Trendi (Adet)", chartX2 + 20, 535);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = chartY + (chartH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(chartX2 + 20, y);
            ctx.lineTo(chartX2 + 20 + chartW, y);
            ctx.stroke();
        }

        const barW = daysLimit === 7 ? 20 : (daysLimit === 1 ? 6 : 5);
        historyData.forEach((d, idx) => {
            const x = chartX2 + 20 + idx * xStep;
            const barH = d.messages > 0 ? (d.messages / messageMax) * (chartH - 25) : 0;
            const barY = chartY + chartH - barH;
            if (barH > 0) {
                ctx.save();
                const barGrad = ctx.createLinearGradient(x - barW / 2, barY, x - barW / 2, chartY + chartH);
                barGrad.addColorStop(0, "rgba(127, 0, 255, 0.55)");
                barGrad.addColorStop(1, "rgba(127, 0, 255, 0.05)");
                ctx.fillStyle = barGrad;
                ctx.strokeStyle = "rgba(127, 0, 255, 0.90)";
                ctx.lineWidth = 1.5;
                ctx.shadowColor = colors.secondary;
                ctx.shadowBlur = 4;
                ctx.beginPath();
                this.drawRoundedRect(ctx, x - barW / 2, barY, barW, barH, daysLimit === 7 ? 5 : 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                const isLastIdx = idx === pointsCount - 1;
                if (daysLimit === 7 || isLastIdx) {
                    ctx.fillStyle = colors.secondary;
                    ctx.font = "bold 11px sans-serif";
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.fillText(`${d.messages}ad`, x, barY - 10);
                    ctx.restore();
                }
            }
        });

        ctx.fillStyle = colors.subTextColor;
        ctx.font = "12px sans-serif";
        historyData.forEach((d, idx) => {
            const x = chartX2 + 20 + idx * xStep;
            if (daysLimit === 7) {
                ctx.save();
                ctx.textAlign = "center";
                ctx.fillText(d.label, x, chartY + chartH + 25);
                ctx.restore();
            } else if (daysLimit === 1) {
                if (idx === 0 || idx === 8 || idx === 16 || idx === 23) {
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.fillText(d.label, x, chartY + chartH + 25);
                    ctx.restore();
                }
            } else {
                if (idx === 0 || idx === 14 || idx === 29) {
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.fillText(d.label, x, chartY + chartH + 25);
                    ctx.restore();
                }
            }
        });

        return canvas.toBuffer("image/png");
    }

    static async drawSetupCard(data) {
        const width = 1500;
        const height = 1100;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(300, 300, 50, 250, 250, 550);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.09)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(1200, 750, 50, 1100, 700, 550);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.09)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText("LOKI GELISMIS KURULUM PANELI", 70, 85);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "18px sans-serif";
        ctx.fillText("Sunucu Istatistik Sistemi Canli Konfigurasyon Gostergesi", 70, 115);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 145);
        ctx.lineTo(1430, 145);
        ctx.stroke();

        this.drawGlassPanel(ctx, 70, 180, 660, 860, 30);
        this.drawGlassPanel(ctx, 770, 180, 660, 860, 30);

        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(110, 233, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("Genel Ayarlar", 130, 240);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 265);
        ctx.lineTo(630, 265);
        ctx.stroke();

        const configFields = [
            { label: "Izinli Komut Kanallari", val: data.allowedChannels.join(", ") || "Tum Kanallar Acik (Varsayilan)" },
            { label: "Bot Ses Kanali", val: data.botVoiceChannel },
            { label: "Sifirlama Log Kanali", val: data.logChannel },
            { label: "Twitch Adresi (Mor Yayin)", val: data.twitchURL },
            { label: "Durum Basligi", val: data.activityName },
            { label: "Yetkili Rolleri", val: data.staffRoles.join(", ") || "Ayarlanmis" }
        ];

        configFields.forEach((field, idx) => {
            const y = 295 + idx * 82;
            ctx.fillStyle = "rgba(0, 242, 254, 0.18)";
            this.drawRoundedRect(ctx, 100, y - 24, 10, 24, 4);
            ctx.fill();
            ctx.fillStyle = colors.subTextColor;
            ctx.font = "bold 17px sans-serif";
            ctx.fillText(field.label, 125, y - 6);
            const safeVal = field.val
                .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                .replace(/[^ -~]/g, "");
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 17px sans-serif";
            if (idx === 0 || idx === 5) {
                const maxLen = 55;
                if (safeVal.length > maxLen) {
                    const line1 = safeVal.substring(0, maxLen);
                    const lastComma = line1.lastIndexOf(",");
                    const breakIdx = lastComma > 30 ? lastComma + 1 : maxLen;
                    const part1 = safeVal.substring(0, breakIdx).trim();
                    const part2 = safeVal.substring(breakIdx).trim();
                    ctx.fillText(part1, 125, y + 18);
                    ctx.fillText(part2.length > maxLen ? part2.substring(0, maxLen - 3) + "..." : part2, 125, y + 38);
                } else {
                    ctx.fillText(safeVal, 125, y + 18);
                }
            } else {
                const displayVal = safeVal.length > 50 ? safeVal.substring(0, 47) + "..." : safeVal;
                ctx.fillText(displayVal, 125, y + 18);
            }
        });

        const catY = 800;
        ctx.fillStyle = "rgba(0, 242, 254, 0.18)";
        this.drawRoundedRect(ctx, 100, catY - 24, 10, 24, 4);
        ctx.fill();
        ctx.fillStyle = colors.subTextColor;
        ctx.font = "bold 17px sans-serif";
        ctx.fillText("Kategori Ayarlari", 125, catY - 6);

        let currentY = catY + 22;
        data.voiceCategories.forEach((cat) => {
            ctx.fillStyle = colors.primary;
            ctx.font = "bold 15px sans-serif";
            const shortName = cat.name.replace(" Ses", "");
            const safeName = shortName
                .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                .replace(/[^ -~]/g, "");
            ctx.fillText(`• ${safeName}:`, 115, currentY);
            ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
            ctx.font = "14px sans-serif";
            const chansStr = (cat.channelsList || []).join(", ") || "Secilmemis";
            const safeChans = chansStr
                .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                .replace(/[^ -~]/g, "");
            const maxWidth = 460;
            const words = safeChans.split(", ");
            let line1 = "";
            let line2 = "";
            for (let i = 0; i < words.length; i++) {
                const testLine = line1 ? line1 + ", " + words[i] : words[i];
                if (ctx.measureText(testLine).width <= maxWidth) {
                    line1 = testLine;
                } else {
                    line2 = words.slice(i).join(", ");
                    break;
                }
            }
            ctx.fillText(line1, 210, currentY);
            if (line2) {
                currentY += 18;
                const displayLine2 = line2.length > 65 ? line2.substring(0, 62) + "..." : line2;
                ctx.fillText(displayLine2, 210, currentY);
            }
            currentY += 26;
        });

        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(810, 233, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("Ses Istatistik Kategorileri", 830, 240);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(800, 265);
        ctx.lineTo(1380, 265);
        ctx.stroke();

        data.voiceCategories.forEach((cat, idx) => {
            const y = 295 + idx * 112;
            ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
            this.drawRoundedRect(ctx, 800, y, 600, 95, 20);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.drawRoundedRect(ctx, 800, y, 600, 95, 20);
            ctx.stroke();
            const safeCatName = cat.name
                .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                .replace(/[^ -~]/g, "");
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 22px sans-serif";
            ctx.fillText(safeCatName, 830, y + 42);
            ctx.fillStyle = colors.subTextColor;
            ctx.font = "17px sans-serif";
            ctx.fillText(`Anahtar: ${cat.key}`, 830, y + 70);
            const boxX = 1270;
            const boxY = y + 26;
            const boxW = 100;
            const boxH = 42;
            ctx.fillStyle = "rgba(127, 0, 255, 0.12)";
            this.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10);
            ctx.fill();
            ctx.strokeStyle = colors.secondary;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            this.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 10);
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px sans-serif";
            ctx.save();
            ctx.textAlign = "center";
            ctx.fillText(`${cat.multiplier}x`, boxX + boxW / 2, boxY + 26);
            ctx.restore();
        });

        return canvas.toBuffer("image/png");
    }

    static async drawTopCard(data) {
        const width = 1500;
        const height = 1000;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(300, 300, 50, 250, 250, 550);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.09)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(1200, 750, 50, 1100, 700, 550);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.09)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText("LOKI SUNUCU AKTIFLIK SIRALAMASI", 70, 85);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "18px sans-serif";
        ctx.fillText("Sunucu Istatistik Sistemi Genel Ses ve Mesaj Liderlik Tablosu", 70, 115);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 145);
        ctx.lineTo(1430, 145);
        ctx.stroke();

        this.drawGlassPanel(ctx, 70, 180, 660, 780, 30);
        this.drawGlassPanel(ctx, 770, 180, 660, 780, 30);

        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(110, 233, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("En Aktif Ses Kullanicilari", 130, 240);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 265);
        ctx.lineTo(630, 265);
        ctx.stroke();

        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(810, 233, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("En Aktif Mesaj Kullanicilari", 830, 240);

        ctx.beginPath();
        ctx.moveTo(800, 265);
        ctx.lineTo(1330, 265);
        ctx.stroke();

        const drawList = async (list, startX, isVoice) => {
            const listColors = isVoice
                ? { accent: colors.primary, accentBg: "rgba(0, 242, 254, 0.12)" }
                : { accent: colors.secondary, accentBg: "rgba(127, 0, 255, 0.12)" };

            for (let idx = 0; idx < 8; idx++) {
                const y = 295 + idx * 78;
                ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
                this.drawRoundedRect(ctx, startX + 30, y, 600, 64, 12);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                this.drawRoundedRect(ctx, startX + 30, y, 600, 64, 12);
                ctx.stroke();

                const user = list[idx];
                let rankColor = "#ffffff";
                if (idx === 0) rankColor = "#ffd700";
                else if (idx === 1) rankColor = "#c0c0c0";
                else if (idx === 2) rankColor = "#cd7f32";

                ctx.fillStyle = rankColor;
                ctx.font = "bold 20px sans-serif";
                ctx.fillText(`#${idx + 1}`, startX + 50, y + 38);

                if (user) {
                    let avatarImg = null;
                    try { avatarImg = await loadImage(user.avatarUrl); } catch (e) {}

                    const avX = startX + 95;
                    const avY = y + 12;
                    const avSize = 40;

                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                    ctx.clip();
                    if (avatarImg) {
                        ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
                    } else {
                        ctx.fillStyle = rankColor;
                        ctx.beginPath();
                        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = "#000000";
                        ctx.font = "bold 16px sans-serif";
                        ctx.textAlign = "center";
                        ctx.fillText(user.name.charAt(0).toUpperCase(), avX + avSize / 2, avY + 26);
                    }
                    ctx.restore();

                    const safeName = user.name
                        .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                        .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                        .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                        .replace(/[^ -~]/g, "");
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "bold 18px sans-serif";
                    const displayName = safeName.length > 25 ? safeName.substring(0, 23) + "..." : safeName;
                    ctx.fillText(displayName, startX + 155, y + 37);

                    const displayValue = isVoice ? this.formatDuration(user.value) : `${user.value.toLocaleString()} ad`;
                    ctx.font = "bold 15px sans-serif";
                    const valTextWidth = ctx.measureText(displayValue).width;
                    const boxW = Math.max(valTextWidth + 24, 100);
                    const boxH = 34;
                    const boxX = startX + 610 - boxW;
                    const boxY = y + 15;

                    ctx.fillStyle = listColors.accentBg;
                    this.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
                    ctx.fill();
                    ctx.strokeStyle = listColors.accent;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    this.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 8);
                    ctx.stroke();
                    ctx.fillStyle = "#ffffff";
                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.fillText(displayValue, boxX + boxW / 2, boxY + 22);
                    ctx.restore();
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                    ctx.font = "italic 16px sans-serif";
                    ctx.fillText("Bos Pozisyon", startX + 95, y + 37);
                }
            }
        };

        await drawList(data.voiceRank, 70, true);
        await drawList(data.messageRank, 770, false);

        return canvas.toBuffer("image/png");
    }

    static async drawInviteCard(data) {
        const width = 1100;
        const height = 620;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(250, 300, 50, 220, 280, 350);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.08)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(850, 300, 50, 800, 280, 350);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.08)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        this.drawGlassPanel(ctx, 50, 70, 380, 480, 30);
        this.drawGlassPanel(ctx, 470, 70, 580, 130, 25);
        this.drawGlassPanel(ctx, 470, 230, 275, 145, 20);
        this.drawGlassPanel(ctx, 775, 230, 275, 145, 20);
        this.drawGlassPanel(ctx, 470, 405, 275, 145, 20);
        this.drawGlassPanel(ctx, 775, 405, 275, 145, 20);

        let avatarImg = null;
        try { avatarImg = await loadImage(data.avatarUrl); } catch (e) {}

        const avX = 160;
        const avY = 110;
        const avSize = 160;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        if (avatarImg) {
            ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fill();
        }
        ctx.restore();

        let statusColor = "#95a5a6";
        if (data.status === "online") statusColor = "#2ecc71";
        else if (data.status === "idle") statusColor = "#f1c40f";
        else if (data.status === "dnd") statusColor = "#e74c3c";

        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();

        const safeName = data.displayName
            .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
            .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
            .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
            .replace(/[^ -~]/g, "");
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        const displayName = safeName.length > 20 ? safeName.substring(0, 18) + "..." : safeName;
        ctx.fillText(displayName, 240, 320);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "17px sans-serif";
        ctx.fillText(data.tag || "Kullanici", 240, 350);

        const inviteTotal = data.inviteStats.total;
        let titleBadge = "Caylak Davetci";
        let badgeColor = "#7f8c8d";
        if (inviteTotal >= 50) { titleBadge = "Efsanevi Davetci"; badgeColor = "#f1c40f"; }
        else if (inviteTotal >= 30) { titleBadge = "Elit Davetci"; badgeColor = "#9b59b6"; }
        else if (inviteTotal >= 15) { titleBadge = "Usta Davetci"; badgeColor = "#3498db"; }
        else if (inviteTotal >= 5) { titleBadge = "Aktif Davetci"; badgeColor = "#2ecc71"; }

        const badgeW = 180;
        const badgeH = 34;
        const badgeX = 240 - badgeW / 2;
        const badgeY = 385;
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText(titleBadge, 240, badgeY + 22);

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 20px sans-serif";
        ctx.fillText("TOPLAM NET DAVET", 510, 115);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "15px sans-serif";
        ctx.fillText("Sunucuya kazandirilan net uye sayisi", 510, 142);
        ctx.textAlign = "right";
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(`${inviteTotal} ad`, 1010, 148);
        ctx.restore();

        const drawStatsGrid = (x, y, title, value, accentColor, desc) => {
            ctx.save();
            ctx.textAlign = "left";
            ctx.fillStyle = accentColor;
            ctx.beginPath();
            ctx.arc(x + 28, y + 36, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 17px sans-serif";
            ctx.fillText(title, x + 44, y + 42);
            ctx.fillStyle = accentColor;
            ctx.font = "bold 34px sans-serif";
            ctx.fillText(`${value} ad`, x + 28, y + 86);
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.font = "13px sans-serif";
            ctx.fillText(desc, x + 28, y + 118);
            ctx.restore();
        };

        drawStatsGrid(470, 230, "GERCEK DAVET", data.inviteStats.regular, "#2ecc71", "Aktif ve sunucuda olanlar");
        drawStatsGrid(775, 230, "AYRILAN DAVET", data.inviteStats.left, "#e74c3c", "Giris yapip ayrilanlar");
        drawStatsGrid(470, 405, "BONUS DAVET", data.inviteStats.bonus, "#9b59b6", "Yonetici eklemeleri");
        drawStatsGrid(775, 405, "SAHTE DAVET", data.inviteStats.fake, "#f1c40f", "7 gunden genc hesaplar");

        return canvas.toBuffer("image/png");
    }

    static async drawFilterCard(data) {
        const width = 1200;
        const height = 750;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#0a0b10");
        bgGrad.addColorStop(0.5, "#12141d");
        bgGrad.addColorStop(1, "#050609");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(250, 350, 50, 200, 300, 450);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.07)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(950, 350, 50, 900, 300, 450);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.07)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("ISTATISTIK FILTRE YONETIM PANELI", 70, 80);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "17px sans-serif";
        ctx.fillText("Istatistik takibinden muaf tutulan kullanici, kanal ve rollerin listesi", 70, 110);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 135);
        ctx.lineTo(1130, 135);
        ctx.stroke();

        const panelW = 340;
        const panelH = 510;
        const panelY = 170;

        this.drawGlassPanel(ctx, 70, panelY, panelW, panelH, 25);
        this.drawGlassPanel(ctx, 430, panelY, panelW, panelH, 25);
        this.drawGlassPanel(ctx, 790, panelY, panelW, panelH, 25);

        const drawPanelHeader = (x, title, count, color) => {
            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + 35, panelY + 36, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px sans-serif";
            ctx.fillText(title, x + 50, panelY + 43);
            ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
            this.drawRoundedRect(ctx, x + 265, panelY + 22, 50, 28, 8);
            ctx.fill();
            ctx.fillStyle = color;
            ctx.font = "bold 15px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(String(count), x + 290, panelY + 41);
            ctx.restore();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 20, panelY + 68);
            ctx.lineTo(x + 320, panelY + 68);
            ctx.stroke();
        };

        drawPanelHeader(70, "Kullanicilar", data.users.length, "#00f2fe");
        drawPanelHeader(430, "Kanallar", data.channels.length, "#2ecc71");
        drawPanelHeader(790, "Roller", data.roles.length, "#9b59b6");

        const startItemY = panelY + 90;
        const itemSpacing = 60;

        if (data.users.length === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "italic 16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Filtrelenmis uye yok.", 240, panelY + 250);
        } else {
            for (let i = 0; i < Math.min(data.users.length, 6); i++) {
                const user = data.users[i];
                const itemY = startItemY + i * itemSpacing;
                let avImg = null;
                try { avImg = await loadImage(user.avatarUrl); } catch {}
                ctx.save();
                ctx.beginPath();
                ctx.arc(110, itemY + 20, 20, 0, Math.PI * 2);
                ctx.clip();
                if (avImg) {
                    ctx.drawImage(avImg, 90, itemY, 40, 40);
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                    ctx.fill();
                }
                ctx.restore();
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 16px sans-serif";
                ctx.textAlign = "left";
                const cleanName = user.name.replace(/[^ -~]/g, "");
                const dispName = cleanName.length > 18 ? cleanName.substring(0, 16) + "..." : cleanName;
                ctx.fillText(dispName, 145, itemY + 26);
            }
            if (data.users.length > 6) {
                ctx.fillStyle = "rgba(0, 242, 254, 0.6)";
                ctx.font = "italic 14px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(`+ ${data.users.length - 6} uye daha...`, 240, panelY + 475);
            }
        }

        if (data.channels.length === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "italic 16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Filtrelenmis kanal yok.", 600, panelY + 250);
        } else {
            ctx.textAlign = "left";
            for (let i = 0; i < Math.min(data.channels.length, 6); i++) {
                const chanName = data.channels[i];
                const itemY = startItemY + i * itemSpacing;
                ctx.fillStyle = "rgba(46, 204, 113, 0.05)";
                this.drawRoundedRect(ctx, 455, itemY, 290, 40, 8);
                ctx.fill();
                ctx.strokeStyle = "rgba(46, 204, 113, 0.2)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                this.drawRoundedRect(ctx, 455, itemY, 290, 40, 8);
                ctx.stroke();
                ctx.fillStyle = "#2ecc71";
                ctx.font = "bold 17px sans-serif";
                ctx.fillText("#", 475, itemY + 26);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 15px sans-serif";
                const cleanChan = chanName.replace(/[^ -~]/g, "").trim();
                const dispChan = cleanChan.length > 20 ? cleanChan.substring(0, 18) + "..." : cleanChan;
                ctx.fillText(dispChan, 495, itemY + 26);
            }
            if (data.channels.length > 6) {
                ctx.fillStyle = "rgba(46, 204, 113, 0.6)";
                ctx.font = "italic 14px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(`+ ${data.channels.length - 6} kanal daha...`, 600, panelY + 475);
            }
        }

        if (data.roles.length === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "italic 16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Filtrelenmis rol yok.", 960, panelY + 250);
        } else {
            ctx.textAlign = "left";
            for (let i = 0; i < Math.min(data.roles.length, 6); i++) {
                const role = data.roles[i];
                const itemY = startItemY + i * itemSpacing;
                const roleColor = role.color || "#9b59b6";
                ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
                this.drawRoundedRect(ctx, 815, itemY, 290, 40, 8);
                ctx.fill();
                ctx.strokeStyle = roleColor;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                this.drawRoundedRect(ctx, 815, itemY, 290, 40, 8);
                ctx.stroke();
                ctx.fillStyle = roleColor;
                ctx.font = "bold 17px sans-serif";
                ctx.fillText("@", 835, itemY + 26);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 15px sans-serif";
                const cleanRole = role.name.replace(/[^ -~]/g, "").trim();
                const dispRole = cleanRole.length > 20 ? cleanRole.substring(0, 18) + "..." : cleanRole;
                ctx.fillText(dispRole, 855, itemY + 26);
            }
            if (data.roles.length > 6) {
                ctx.fillStyle = "rgba(155, 89, 182, 0.6)";
                ctx.font = "italic 14px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(`+ ${data.roles.length - 6} rol daha...`, 960, panelY + 475);
            }
        }

        return canvas.toBuffer("image/png");
    }

    static async drawServerCard(data) {
        const width = 1000;
        const height = 600;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#10121a");
        bgGrad.addColorStop(1, "#030406");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(200, 300, 30, 200, 300, 300);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.05)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(750, 300, 30, 750, 300, 300);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.05)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        this.drawGlassPanel(ctx, 40, 50, 320, 500, 25);
        this.drawGlassPanel(ctx, 390, 50, 270, 110, 15);
        this.drawGlassPanel(ctx, 690, 50, 270, 110, 15);
        this.drawGlassPanel(ctx, 390, 180, 570, 140, 20);
        this.drawGlassPanel(ctx, 390, 340, 570, 210, 20);

        let iconImg = null;
        try { iconImg = await loadImage(data.serverIconUrl); } catch {}

        const iconX = 135;
        const iconY = 80;
        const iconSize = 130;

        ctx.save();
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
        ctx.clip();
        if (iconImg) {
            ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fill();
        }
        ctx.restore();

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        const cleanServerName = data.serverName.replace(/[^ -~]/g, "");
        const dispServerName = cleanServerName.length > 20 ? cleanServerName.substring(0, 18) + "..." : cleanServerName;
        ctx.fillText(dispServerName, 200, 250);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, 275);
        ctx.lineTo(320, 275);
        ctx.stroke();

        const drawServerDetail = (y, label, val) => {
            ctx.save();
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.font = "12px sans-serif";
            ctx.fillText(label, 75, y);
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px sans-serif";
            const valClean = val.replace(/[^ -~]/g, "");
            const valTrunc = valClean.length > 18 ? valClean.substring(0, 16) + "..." : valClean;
            ctx.fillText(valTrunc, 325, y);
            ctx.restore();
        };

        drawServerDetail(310, "Owner / Kurucu", data.ownerName);
        drawServerDetail(345, "Created / Kurulus", data.createdAt);
        drawServerDetail(380, "Boosts / Takviye", `Lvl ${data.boostLevel} (${data.boostCount} Boost)`);
        drawServerDetail(415, "Members / Toplam", `${data.memberCount} Uye`);

        const badgeW = 200;
        const badgeH = 34;
        const badgeX = 100;
        const badgeY = 465;
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 242, 254, 0.3)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GENERAL STATUS DASHBOARD", 200, badgeY + 21);

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("TOPLAM SES AKTIFLIGI", 410, 85);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.font = "10px sans-serif";
        ctx.fillText("Sunucu geneli seste kalma", 410, 102);
        const totalVoiceHours = Math.floor(data.totalVoiceSeconds / 3600);
        ctx.textAlign = "right";
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(`${totalVoiceHours} saat`, 640, 100);
        ctx.restore();

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#9b59b6";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("TOPLAM MESAJ AKTIFLIGI", 710, 85);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.font = "10px sans-serif";
        ctx.fillText("Sunucu geneli toplam mesaj", 710, 102);
        ctx.textAlign = "right";
        ctx.fillStyle = "#9b59b6";
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(`${data.totalMessages.toLocaleString()} ad`, 940, 100);
        ctx.restore();

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("ZIRVEDEKI KANALLAR", 410, 210);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(410, 225);
        ctx.lineTo(930, 225);
        ctx.stroke();

        ctx.fillStyle = colors.primary;
        ctx.font = "bold 12px sans-serif";
        const cleanVoiceChan = (data.topVoiceChannel.name || "").replace(/[^ -~]/g, "");
        ctx.fillText(`Ses: #${cleanVoiceChan.length > 15 ? cleanVoiceChan.substring(0, 13) + "..." : cleanVoiceChan}`, 410, 260);
        ctx.textAlign = "right";
        ctx.fillText(`${Math.floor(data.topVoiceChannel.value / 3600)} saat`, 930, 260);

        ctx.textAlign = "left";
        ctx.fillStyle = "#9b59b6";
        const cleanMsgChan = (data.topMessageChannel.name || "").replace(/[^ -~]/g, "");
        ctx.fillText(`Mesaj: #${cleanMsgChan.length > 15 ? cleanMsgChan.substring(0, 13) + "..." : cleanMsgChan}`, 410, 290);
        ctx.textAlign = "right";
        ctx.fillStyle = "#9b59b6";
        ctx.fillText(`${data.topMessageChannel.value.toLocaleString("tr-TR")} ad`, 930, 290);
        ctx.restore();

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("EN AKTIF UYELER", 410, 375);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(410, 390);
        ctx.lineTo(930, 390);
        ctx.stroke();

        const drawTopUserList = async (users, startX, isVoice) => {
            for (let i = 0; i < Math.min(users.length, 3); i++) {
                const u = users[i];
                const itemY = 405 + i * 42;
                let rankColor = "#7f8c8d";
                if (i === 0) rankColor = "#ffd700";
                else if (i === 1) rankColor = "#c0c0c0";
                else if (i === 2) rankColor = "#cd7f32";

                ctx.fillStyle = rankColor;
                ctx.font = "bold 11px sans-serif";
                ctx.fillText(`#${i + 1}`, startX + 10, itemY + 20);

                let uAv = null;
                try { uAv = await loadImage(u.avatarUrl); } catch {}

                ctx.save();
                ctx.beginPath();
                ctx.arc(startX + 38, itemY + 16, 12, 0, Math.PI * 2);
                ctx.clip();
                if (uAv) {
                    ctx.drawImage(uAv, startX + 26, itemY + 4, 24, 24);
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                    ctx.fill();
                }
                ctx.restore();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 12px sans-serif";
                const cleanUName = u.name.replace(/[^ -~]/g, "");
                const dispUName = cleanUName.length > 13 ? cleanUName.substring(0, 11) + "..." : cleanUName;
                ctx.fillText(dispUName, startX + 60, itemY + 20);

                ctx.textAlign = "right";
                ctx.fillStyle = isVoice ? colors.primary : "#9b59b6";
                ctx.font = "bold 11px sans-serif";
                const displayVal = isVoice ? `${Math.floor(u.value / 3600)} saat` : `${u.value.toLocaleString("tr-TR")} ad`;
                ctx.fillText(displayVal, startX + 250, itemY + 20);
                ctx.textAlign = "left";
            }
        };

        await drawTopUserList(data.topVoiceUsers, 410, true);
        await drawTopUserList(data.topMessageUsers, 695, false);
        ctx.restore();

        return canvas.toBuffer("image/png");
    }

    static async drawChannelCard(data) {
        const width = 800;
        const height = 500;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const accentColor = data.isVoice ? colors.primary : "#9b59b6";
        const accentGlow = data.isVoice ? "rgba(0, 242, 254, 0.05)" : "rgba(155, 89, 182, 0.05)";

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#10121a");
        bgGrad.addColorStop(1, "#030406");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialGlow = ctx.createRadialGradient(200, 250, 50, 200, 250, 300);
        radialGlow.addColorStop(0, accentGlow);
        radialGlow.addColorStop(1, "transparent");
        ctx.fillStyle = radialGlow;
        ctx.fillRect(0, 0, width, height);

        this.drawGlassPanel(ctx, 40, 100, 310, 350, 20);
        this.drawGlassPanel(ctx, 380, 100, 380, 350, 20);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("KANAL ISTATISTIK DETAYI", 40, 55);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "12px sans-serif";
        ctx.fillText("Bu kanala ait sunucu genel aktiflik ve katilim verileri", 40, 78);

        const circleX = 145;
        const circleY = 130;
        const circleR = 45;

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(circleX + circleR, circleY + circleR, circleR + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.beginPath();
        ctx.arc(circleX + circleR, circleY + circleR, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accentColor;
        ctx.font = "bold 40px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(data.isVoice ? "VOL" : "#", circleX + circleR, circleY + circleR + 14);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        const cleanChanName = data.channelName.replace(/[^ -~]/g, "");
        const dispChanName = cleanChanName.length > 18 ? cleanChanName.substring(0, 16) + "..." : cleanChanName;
        ctx.fillText(data.isVoice ? dispChanName : `#${dispChanName}`, 195, 250);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(70, 270);
        ctx.lineTo(320, 270);
        ctx.stroke();

        const drawDetailRow = (y, label, val) => {
            ctx.save();
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.font = "11px sans-serif";
            ctx.fillText(label, 70, y);
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px sans-serif";
            ctx.fillText(val, 320, y);
            ctx.restore();
        };

        const cleanCatName = data.categoryName.replace(/[^ -~]/g, "");
        const dispCatName = cleanCatName.length > 18 ? cleanCatName.substring(0, 16) + "..." : cleanCatName;
        drawDetailRow(305, "Category / Kategori", dispCatName || "Yok");
        drawDetailRow(340, data.isVoice ? "Toplam Sure" : "Toplam Mesaj", data.isVoice ? `${Math.floor(data.totalValue / 3600)} saat` : `${data.totalValue.toLocaleString("tr-TR")} ad`);
        drawDetailRow(375, "Sunucu Hacmi", `%${data.serverPercentage}`);

        const tagY = 405;
        ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
        this.drawRoundedRect(ctx, 85, tagY, 220, 26, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.drawRoundedRect(ctx, 85, tagY, 220, 26, 6);
        ctx.stroke();
        ctx.fillStyle = accentColor;
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(data.isVoice ? "ACTIVE VOICE CHANNEL" : "ACTIVE TEXT CHANNEL", 195, tagY + 16);

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("EN AKTIF KATILIMCILAR", 410, 135);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        ctx.moveTo(410, 150);
        ctx.lineTo(730, 150);
        ctx.stroke();

        if (data.topUsers.length === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "italic 13px sans-serif";
            ctx.fillText("Bu kanalda veri bulunmuyor.", 410, 200);
            ctx.restore();
            return canvas.toBuffer("image/png");
        }

        for (let i = 0; i < Math.min(data.topUsers.length, 5); i++) {
            const u = data.topUsers[i];
            const itemY = 165 + i * 50;
            let rankColor = "#7f8c8d";
            if (i === 0) rankColor = "#ffd700";
            else if (i === 1) rankColor = "#c0c0c0";
            else if (i === 2) rankColor = "#cd7f32";

            ctx.fillStyle = rankColor;
            ctx.font = "bold 13px sans-serif";
            ctx.fillText(`#${i + 1}`, 410, itemY + 22);

            let uAv = null;
            try { uAv = await loadImage(u.avatarUrl); } catch {}

            ctx.save();
            ctx.beginPath();
            ctx.arc(448, itemY + 16, 12, 0, Math.PI * 2);
            ctx.clip();
            if (uAv) {
                ctx.drawImage(uAv, 436, itemY + 4, 24, 24);
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                ctx.fill();
            }
            ctx.restore();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 12px sans-serif";
            const cleanUName = u.name.replace(/[^ -~]/g, "");
            const dispUName = cleanUName.length > 15 ? cleanUName.substring(0, 13) + "..." : cleanUName;
            ctx.fillText(dispUName, 470, itemY + 20);

            ctx.textAlign = "right";
            ctx.fillStyle = accentColor;
            ctx.font = "bold 12px sans-serif";
            const displayVal = data.isVoice ? `${Math.floor(u.value / 3600)} saat` : `${u.value.toLocaleString("tr-TR")} ad`;
            ctx.fillText(displayVal, 730, itemY + 20);
            ctx.textAlign = "left";
        }

        ctx.restore();
        return canvas.toBuffer("image/png");
    }

    static async drawVoiceDetailCard(data) {
        const width = 1100;
        const height = 620;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(250, 300, 30, 220, 280, 350);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.08)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(850, 300, 30, 800, 280, 350);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.08)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        this.drawGlassPanel(ctx, 50, 70, 380, 480, 30);
        this.drawGlassPanel(ctx, 470, 70, 580, 480, 30);

        let avatarImg = null;
        try { avatarImg = await loadImage(data.avatarUrl); } catch {}

        const avX = 160;
        const avY = 110;
        const avSize = 160;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        if (avatarImg) {
            ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fill();
        }
        ctx.restore();

        let statusColor = "#95a5a6";
        if (data.status === "online") statusColor = "#2ecc71";
        else if (data.status === "idle") statusColor = "#f1c40f";
        else if (data.status === "dnd") statusColor = "#e74c3c";

        ctx.strokeStyle = statusColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();

        const safeDisplayName = data.displayName
            .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
            .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
            .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
            .replace(/[^ -~]/g, "");
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 26px sans-serif";
        ctx.textAlign = "center";
        const displayName = safeDisplayName.length > 20 ? safeDisplayName.substring(0, 18) + "..." : safeDisplayName;
        ctx.fillText(displayName, 240, 320);

        const safeTag = data.tag
            .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
            .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
            .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
            .replace(/[^ -~]/g, "");
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "17px sans-serif";
        ctx.fillText(safeTag || "Kullanici", 240, 355);

        ctx.fillStyle = colors.primary;
        ctx.font = "bold 17px sans-serif";
        ctx.fillText("TOPLAM SES SURESI", 240, 420);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(this.formatDuration(data.totalVoiceSeconds), 240, 470);

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("SES KATEGORILERI ANALIZI", 510, 120);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(510, 145);
        ctx.lineTo(1010, 145);
        ctx.stroke();

        const maxSeconds = Math.max(...data.categories.map(c => c.seconds), 1);

        data.categories.forEach((cat, idx) => {
            const y = 175 + idx * 72;
            ctx.fillStyle = colors.primary;
            ctx.beginPath();
            ctx.arc(515, y + 14, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 17px sans-serif";
            const safeCatName = cat.name
                .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                .replace(/[^ -~]/g, "");
            ctx.fillText(`${safeCatName} (${cat.multiplier}x)`, 530, y + 20);

            ctx.textAlign = "right";
            ctx.fillStyle = colors.subTextColor;
            ctx.font = "bold 16px sans-serif";
            ctx.fillText(this.formatDuration(cat.seconds), 1010, y + 20);
            ctx.textAlign = "left";

            const barW = 480;
            const barH = 10;
            ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
            this.drawRoundedRect(ctx, 530, y + 32, barW, barH, 5);
            ctx.fill();

            const filledW = Math.max(10, (cat.seconds / maxSeconds) * barW);
            const progressGrad = ctx.createLinearGradient(530, y + 32, 530 + filledW, y + 32);
            progressGrad.addColorStop(0, colors.primary);
            progressGrad.addColorStop(1, colors.secondary);
            ctx.fillStyle = progressGrad;
            ctx.beginPath();
            this.drawRoundedRect(ctx, 530, y + 32, filledW, barH, 5);
            ctx.fill();
        });

        ctx.restore();
        return canvas.toBuffer("image/png");
    }

    static async drawTopInviteCard(data) {
        const width = 1100;
        const height = 1100;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(550, 550, 150, 550, 550, 600);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.08)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText("LOKI SUNUCU DAVET SIRALAMASI", 70, 80);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "17px sans-serif";
        ctx.fillText("Sunucu Davet Sistemi Genel Liderlik Tablosu", 70, 110);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 135);
        ctx.lineTo(1030, 135);
        ctx.stroke();

        this.drawGlassPanel(ctx, 70, 170, 960, 860, 30);

        for (let idx = 0; idx < 8; idx++) {
            const y = 205 + idx * 96;
            ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
            this.drawRoundedRect(ctx, 100, y, 900, 72, 12);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.drawRoundedRect(ctx, 100, y, 900, 72, 12);
            ctx.stroke();

            const user = data.inviteRank[idx];
            let rankColor = "#ffffff";
            if (idx === 0) rankColor = "#ffd700";
            else if (idx === 1) rankColor = "#c0c0c0";
            else if (idx === 2) rankColor = "#cd7f32";

            ctx.fillStyle = rankColor;
            ctx.font = "bold 22px sans-serif";
            ctx.fillText(`#${idx + 1}`, 125, y + 43);

            if (user) {
                let avImg = null;
                try { avImg = await loadImage(user.avatarUrl); } catch {}

                const avX = 180;
                const avY = y + 13;
                const avSize = 46;

                ctx.save();
                ctx.beginPath();
                ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                ctx.clip();
                if (avImg) {
                    ctx.drawImage(avImg, avX, avY, avSize, avSize);
                } else {
                    ctx.fillStyle = rankColor;
                    ctx.beginPath();
                    ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "#000000";
                    ctx.font = "bold 18px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(user.name.charAt(0).toUpperCase(), avX + avSize / 2, avY + 30);
                }
                ctx.restore();

                const safeUName = user.name
                    .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
                    .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
                    .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
                    .replace(/[^ -~]/g, "");
                const dispName = safeUName.length > 22 ? safeUName.substring(0, 20) + "..." : safeUName;
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 18px sans-serif";
                ctx.fillText(dispName, 245, y + 43);

                ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
                ctx.font = "bold 14px sans-serif";
                ctx.fillText(`Gercek: ${user.regular} | Ayrilan: ${user.left} | Bonus: ${user.bonus} | Sahte: ${user.fake}`, 440, y + 43);

                ctx.save();
                ctx.textAlign = "right";
                ctx.fillStyle = colors.primary;
                ctx.font = "bold 22px sans-serif";
                ctx.fillText(`${user.total} net`, 970, y + 45);
                ctx.restore();
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                ctx.font = "italic 16px sans-serif";
                ctx.fillText("Bos Pozisyon", 245, y + 43);
            }
        }

        return canvas.toBuffer("image/png");
    }

    static async drawStaffStatsCard(data) {
        const width = 1600;
        const height = 1000;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(300, 300, 50, 250, 250, 450);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.08)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(1300, 700, 50, 1200, 650, 450);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.08)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText("LOKI YETKILI AKTIFLIK DENETIM DASHBOARD'U", 70, 85);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "18px sans-serif";
        const safeServerName = data.serverName.replace(/[^ -~]/g, "");
        ctx.fillText(`${safeServerName} Yetkili Kadrosu Genel Ses ve Mesaj Denetim Raporu`, 70, 120);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 145);
        ctx.lineTo(1530, 145);
        ctx.stroke();

        this.drawGlassPanel(ctx, 70, 180, 680, 780, 30);
        this.drawGlassPanel(ctx, 790, 180, 740, 780, 30);

        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(110, 233, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText("Haftanin Zirvesindeki Yetkililer", 130, 240);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 265);
        ctx.lineTo(650, 265);
        ctx.stroke();

        for (let idx = 0; idx < 3; idx++) {
            const y = 290 + idx * 230;
            const staff = data.staffRank[idx];

            ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
            this.drawRoundedRect(ctx, 100, y, 620, 195, 20);
            ctx.fill();

            ctx.strokeStyle = idx === 0 ? "#ffd700" : (idx === 1 ? "#c0c0c0" : "#cd7f32");
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            this.drawRoundedRect(ctx, 100, y, 620, 195, 20);
            ctx.stroke();

            ctx.fillStyle = idx === 0 ? "#ffd700" : (idx === 1 ? "#c0c0c0" : "#cd7f32");
            ctx.font = "bold 24px sans-serif";
            ctx.fillText(idx === 0 ? "Zirve" : (idx === 1 ? "2. Yetkili" : "3. Yetkili"), 125, y + 45);

            if (staff) {
                let avImg = null;
                try { avImg = await loadImage(staff.avatarUrl); } catch {}

                const avX = 470;
                const avY = y + 35;
                const avSize = 120;

                ctx.save();
                ctx.beginPath();
                ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                ctx.clip();
                if (avImg) {
                    ctx.drawImage(avImg, avX, avY, avSize, avSize);
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                    ctx.fill();
                }
                ctx.restore();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 22px sans-serif";
                const cleanName = staff.name.replace(/[^ -~]/g, "");
                const dispName = cleanName.length > 20 ? cleanName.substring(0, 18) + "..." : cleanName;
                ctx.fillText(dispName, 125, y + 90);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "bold 16px sans-serif";
                ctx.fillText(`Ses: ${this.formatDuration(staff.voiceSeconds)}`, 125, y + 130);
                ctx.fillText(`Mesaj: ${staff.messages} ad`, 125, y + 160);
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                ctx.font = "italic 18px sans-serif";
                ctx.fillText("Katilim Yok", 125, y + 95);
            }
        }

        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.arc(830, 233, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 26px sans-serif";
        ctx.fillText(`Yetkili Aktiflik Kadrosu (Toplam: ${data.staffCount})`, 850, 240);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(820, 265);
        ctx.lineTo(1490, 265);
        ctx.stroke();

        for (let idx = 0; idx < 8; idx++) {
            const y = 295 + idx * 82;
            const staff = data.staffRank[idx + 3];

            ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
            this.drawRoundedRect(ctx, 820, y, 680, 64, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.drawRoundedRect(ctx, 820, y, 680, 64, 10);
            ctx.stroke();

            if (staff) {
                let avImg = null;
                try { avImg = await loadImage(staff.avatarUrl); } catch {}

                const avX = 840;
                const avY = y + 12;
                const avSize = 40;

                ctx.save();
                ctx.beginPath();
                ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
                ctx.clip();
                if (avImg) {
                    ctx.drawImage(avImg, avX, avY, avSize, avSize);
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                    ctx.fill();
                }
                ctx.restore();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 16px sans-serif";
                const cleanName = staff.name.replace(/[^ -~]/g, "");
                const dispName = cleanName.length > 20 ? cleanName.substring(0, 18) + "..." : cleanName;
                ctx.fillText(dispName, 900, y + 37);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "bold 15px sans-serif";
                ctx.fillText(`${this.formatDuration(staff.voiceSeconds)} ses | ${staff.messages} msj`, 1080, y + 37);
                ctx.save();
                ctx.textAlign = "right";
                if (staff.targetComplete) {
                    ctx.fillStyle = "#2ecc71";
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillText("AKTIF", 1470, y + 37);
                } else {
                    ctx.fillStyle = "#e74c3c";
                    ctx.font = "bold 16px sans-serif";
                    ctx.fillText("PASIF", 1470, y + 37);
                }
                ctx.restore();
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                ctx.font = "italic 15px sans-serif";
                ctx.fillText("Katilim Yok", 900, y + 37);
            }
        }

        return canvas.toBuffer("image/png");
    }

    static async drawActiveVoiceCard(data) {
        const width = 1200;
        const height = 750;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(200, 200, 50, 200, 200, 300);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.05)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText("LOKI CANLI SES AKTIFLIK PANELI", 70, 80);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.font = "17px sans-serif";
        ctx.fillText("Sunucuda anlik seste bulunan kanallar ve uyeler", 70, 110);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 135);
        ctx.lineTo(1130, 135);
        ctx.stroke();

        this.drawGlassPanel(ctx, 70, 170, 340, 510, 25);
        this.drawGlassPanel(ctx, 450, 170, 680, 510, 25);

        ctx.fillStyle = colors.primary;
        ctx.font = "bold 17px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SESTEKI TOPLAM UYE", 240, 230);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText(`${data.totalInVoice} uye`, 240, 280);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(110, 320);
        ctx.lineTo(370, 320);
        ctx.stroke();

        ctx.fillStyle = colors.secondary;
        ctx.font = "bold 17px sans-serif";
        ctx.fillText("AKTIF SES KANALI", 240, 380);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(`${data.channelsCount} kanal`, 240, 430);

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("Aktif Ses Odalari", 490, 220);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(480, 240);
        ctx.lineTo(1100, 240);
        ctx.stroke();

        if (data.channels.length === 0) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "italic 16px sans-serif";
            ctx.fillText("Sunucuda seste uye bulunmuyor.", 490, 285);
        } else {
            for (let idx = 0; idx < Math.min(data.channels.length, 5); idx++) {
                const chan = data.channels[idx];
                const y = 265 + idx * 80;

                ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
                this.drawRoundedRect(ctx, 480, y, 620, 66, 10);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
                ctx.beginPath();
                this.drawRoundedRect(ctx, 480, y, 620, 66, 10);
                ctx.stroke();

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 16px sans-serif";
                const cleanChan = chan.name.replace(/[^ -~]/g, "");
                const dispChan = cleanChan.length > 24 ? cleanChan.substring(0, 22) + "..." : cleanChan;
                ctx.fillText(`VOL ${dispChan}`, 500, y + 27);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "bold 13px sans-serif";
                ctx.fillText(`${chan.userCount} uye aktif`, 500, y + 50);

                if (chan.topUsers && chan.topUsers[0]) {
                    const topU = chan.topUsers[0];
                    ctx.save();
                    ctx.textAlign = "right";
                    ctx.fillStyle = colors.primary;
                    ctx.font = "bold 14px sans-serif";
                    const cleanUName = topU.name.replace(/[^ -~]/g, "");
                    const dispUName = cleanUName.length > 15 ? cleanUName.substring(0, 13) + "..." : cleanUName;
                    ctx.fillText(dispUName, 1080, y + 27);
                    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                    ctx.font = "bold 11px sans-serif";
                    ctx.fillText(this.formatDuration(topU.seconds), 1080, y + 48);
                    ctx.restore();
                }
            }
        }

        ctx.restore();
        return canvas.toBuffer("image/png");
    }

    static async drawBonusInviteCard(data) {
        const width = 800;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#08090d");
        bgGrad.addColorStop(0.5, "#0f1015");
        bgGrad.addColorStop(1, "#040507");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(180, 200, 30, 180, 200, 220);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.06)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(620, 200, 30, 620, 200, 220);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.06)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        this.drawGlassPanel(ctx, 40, 40, 320, 320, 25);
        this.drawGlassPanel(ctx, 390, 40, 370, 320, 25);

        let avatarImg = null;
        try { avatarImg = await loadImage(data.avatarUrl); } catch {}

        const avX = 140;
        const avY = 70;
        const avSize = 120;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
        ctx.clip();
        if (avatarImg) {
            ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.fill();
        }
        ctx.restore();

        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2 + 3, 0, Math.PI * 2);
        ctx.stroke();

        const safeDisplayName = data.displayName
            .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
            .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
            .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
            .replace(/[^ -~]/g, "");
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        const displayName = safeDisplayName.length > 18 ? safeDisplayName.substring(0, 16) + "..." : safeDisplayName;
        ctx.fillText(displayName, 200, 225);

        const safeTag = data.tag
            .replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ğ/g, "G").replace(/ğ/g, "g")
            .replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ö/g, "O").replace(/ö/g, "o")
            .replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ç/g, "C").replace(/ç/g, "c")
            .replace(/[^ -~]/g, "");
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "14px sans-serif";
        ctx.fillText(safeTag || "Kullanici", 200, 250);

        const badgeW = 200;
        const badgeH = 34;
        const badgeX = 200 - badgeW / 2;
        const badgeY = 285;
        ctx.fillStyle = "rgba(0, 242, 254, 0.08)";
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 242, 254, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
        ctx.stroke();
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("DAVET KONTROL PANELI", 200, badgeY + 21);

        ctx.save();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText("DAVET ISTATISTIKLERI", 420, 80);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(420, 95);
        ctx.lineTo(730, 95);
        ctx.stroke();

        const drawMiniStat = (x, y, label, val, color) => {
            ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
            this.drawRoundedRect(ctx, x, y, 145, 60, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            this.drawRoundedRect(ctx, x, y, 145, 60, 10);
            ctx.stroke();
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(label, x + 72, y + 22);
            ctx.fillStyle = color;
            ctx.font = "bold 20px sans-serif";
            ctx.fillText(String(val), x + 72, y + 48);
        };

        const stats = data.inviteStats;
        drawMiniStat(420, 115, "GERCEK", stats.regular || 0, "#2ecc71");
        drawMiniStat(585, 115, "AYRILAN", stats.left || 0, "#e74c3c");
        drawMiniStat(420, 190, "SAHTE", stats.fake || 0, "#f1c40f");
        drawMiniStat(585, 190, "BONUS", stats.bonus || 0, colors.secondary);

        const netY = 265;
        ctx.fillStyle = "rgba(0, 242, 254, 0.03)";
        this.drawRoundedRect(ctx, 420, netY, 310, 65, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 242, 254, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.drawRoundedRect(ctx, 420, netY, 310, 65, 12);
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("NET TOPLAM", 445, netY + 38);
        ctx.textAlign = "right";
        ctx.fillStyle = colors.primary;
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(`${stats.total || 0} davet`, 710, netY + 43);

        ctx.restore();
        return canvas.toBuffer("image/png");
    }

    static async drawHelpCard(data) {
        const width = 1200;
        const height = 750;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");
        const colors = BotSettings.CanvasColors;

        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, "#0a0b10");
        bgGrad.addColorStop(0.5, "#12141d");
        bgGrad.addColorStop(1, "#050609");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        let radialCyan = ctx.createRadialGradient(250, 350, 50, 200, 300, 450);
        radialCyan.addColorStop(0, "rgba(0, 242, 254, 0.08)");
        radialCyan.addColorStop(1, "transparent");
        ctx.fillStyle = radialCyan;
        ctx.fillRect(0, 0, width, height);

        let radialPurple = ctx.createRadialGradient(950, 350, 50, 900, 300, 450);
        radialPurple.addColorStop(0, "rgba(127, 0, 255, 0.08)");
        radialPurple.addColorStop(1, "transparent");
        ctx.fillStyle = radialPurple;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("LOKI KULLANIM KILAVUZU & YARDIM PANELI", 70, 80);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "17px sans-serif";
        ctx.fillText("Sunucu istatistik ve yonetim sisteminin interaktif kullanim kilavuzu", 70, 110);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(70, 135);
        ctx.lineTo(1130, 135);
        ctx.stroke();

        const panelW = 340;
        const panelH = 510;
        const panelY = 170;

        this.drawGlassPanel(ctx, 70, panelY, panelW, panelH, 25);
        this.drawGlassPanel(ctx, 430, panelY, panelW, panelH, 25);
        this.drawGlassPanel(ctx, 790, panelY, panelW, panelH, 25);

        const drawPanelHeader = (x, title, subtitle, color, isActive) => {
            ctx.save();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x + 35, panelY + 36, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 20px sans-serif";
            ctx.fillText(title, x + 50, panelY + 43);
            if (isActive) {
                ctx.fillStyle = "rgba(0, 242, 254, 0.12)";
                this.drawRoundedRect(ctx, x + 245, panelY + 22, 75, 28, 8);
                ctx.fill();
                ctx.fillStyle = colors.primary;
                ctx.font = "bold 13px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("AKTIF TAB", x + 282, panelY + 41);
            } else {
                ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
                this.drawRoundedRect(ctx, x + 245, panelY + 22, 75, 28, 8);
                ctx.fill();
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.font = "bold 13px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("BEKLEMEDE", x + 282, panelY + 41);
            }
            ctx.restore();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 20, panelY + 68);
            ctx.lineTo(x + 320, panelY + 68);
            ctx.stroke();
        };

        drawPanelHeader(70, "Loki Bilgi", "Sistem", "#00f2fe", data.category === "home");
        drawPanelHeader(430, "Yonetim", "Root", "#e74c3c", data.category === "root");
        drawPanelHeader(790, "Istatistik", "Stats", "#9b59b6", data.category === "stats");

        ctx.save();
        ctx.textAlign = "left";

        if (data.category === "home") {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 17px sans-serif";
            ctx.fillText("Loki Istatistik Sistemi", 90, panelY + 110);
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.font = "14px sans-serif";
            ctx.fillText("Yeni nesil, premium 3D ve cam kaplama", 90, panelY + 135);
            ctx.fillText("(Glassmorphic) arayuzleriyle donatilmis", 90, panelY + 155);
            ctx.fillText("aktiflik ve davet takip botu.", 90, panelY + 175);

            const drawInfoField = (y, label, val) => {
                ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
                this.drawRoundedRect(ctx, 90, y, 300, 48, 10);
                ctx.fill();
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "bold 13px sans-serif";
                ctx.fillText(label, 105, y + 28);
                ctx.fillStyle = colors.primary;
                ctx.font = "bold 14px sans-serif";
                ctx.textAlign = "right";
                ctx.fillText(val, 375, y + 28);
                ctx.textAlign = "left";
            };

            drawInfoField(panelY + 210, "Aktif Prefix", BotSettings.Prefix);
            drawInfoField(panelY + 270, "Toplam Komut", "14 Adet");
            drawInfoField(panelY + 330, "Gelistirici Surumu", "v1.4.0 Stable");
            drawInfoField(panelY + 390, "Arayuz Tasarimi", "Premium Neon");

            ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            ctx.font = "italic 13px sans-serif";
            ctx.fillText("Kesmek icin yandaki sekmelere", 90, panelY + 470);
            ctx.fillText("veya asagidaki butonlara tiklayin.", 90, panelY + 490);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 17px sans-serif";
            ctx.fillText("Hizli Gezinti", 90, panelY + 110);
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.font = "14px sans-serif";
            ctx.fillText("Asagidaki butonlari kullanarak sekmeler", 90, panelY + 135);
            ctx.fillText("arasinda dinamik olarak gecis", 90, panelY + 155);
            ctx.fillText("yapabilirsiniz.", 90, panelY + 175);

            const drawNavButtonGlow = (y, label, active) => {
                if (active) {
                    ctx.fillStyle = "rgba(0, 242, 254, 0.05)";
                    this.drawRoundedRect(ctx, 90, y, 300, 55, 12);
                    ctx.fill();
                    ctx.strokeStyle = "rgba(0, 242, 254, 0.25)";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    this.drawRoundedRect(ctx, 90, y, 300, 55, 12);
                    ctx.stroke();
                    ctx.fillStyle = colors.primary;
                } else {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
                    this.drawRoundedRect(ctx, 90, y, 300, 55, 12);
                    ctx.fill();
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    this.drawRoundedRect(ctx, 90, y, 300, 55, 12);
                    ctx.stroke();
                    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                }
                ctx.font = "bold 15px sans-serif";
                ctx.fillText(label, 115, y + 33);
            };

            drawNavButtonGlow(panelY + 220, "Ana Sayfa", false);
            drawNavButtonGlow(panelY + 290, "Yonetici Komutlari", data.category === "root");
            drawNavButtonGlow(panelY + 360, "Istatistik Komutlari", data.category === "stats");
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
            ctx.font = "italic 13px sans-serif";
            ctx.fillText("Ipuclari: Tum komutlar sunucu ici", 90, panelY + 460);
            ctx.fillText("yetki ve rollerle sinirlandirilabilir.", 90, panelY + 480);
        }
        ctx.restore();

        const drawCommandItem = (x, y, name, desc, usage, color) => {
            ctx.save();
            ctx.textAlign = "left";
            ctx.fillStyle = color;
            ctx.font = "bold 16px sans-serif";
            ctx.fillText(BotSettings.Prefix + name, x, y);
            ctx.fillStyle = "#ffffff";
            ctx.font = "13px sans-serif";
            const words = desc.split(" ");
            let line1 = "";
            let line2 = "";
            const maxW = 280;
            for (let w of words) {
                const test = line1 ? line1 + " " + w : w;
                if (ctx.measureText(test).width <= maxW) {
                    line1 = test;
                } else {
                    line2 = line2 ? line2 + " " + w : w;
                }
            }
            ctx.fillText(line1, x, y + 20);
            if (line2) {
                ctx.fillText(line2.length > 40 ? line2.substring(0, 38) + "..." : line2, x, y + 36);
            }
            ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
            ctx.font = "italic 11px sans-serif";
            ctx.fillText("Kullanim: " + usage, x, y + (line2 ? 54 : 38));
            ctx.restore();
        };

        if (data.category === "home") {
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("YONETICI SISTEMI", 450, panelY + 110);
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.font = "14px sans-serif";
            ctx.fillText("Sunucu sahipleri ve bot gelistiricileri", 450, panelY + 140);
            ctx.fillText("icin tasarlanmis gelismis ayar ve", 450, panelY + 160);
            ctx.fillText("muafiyet filtre panelleri.", 450, panelY + 180);

            const drawCatCapsule = (x, y, label, desc, color) => {
                ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
                this.drawRoundedRect(ctx, x, y, 300, 75, 12);
                ctx.fill();
                ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                this.drawRoundedRect(ctx, x, y, 300, 75, 12);
                ctx.stroke();
                ctx.fillStyle = color;
                ctx.font = "bold 15px sans-serif";
                ctx.fillText(label, x + 15, y + 30);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "12px sans-serif";
                ctx.fillText(desc, x + 15, y + 52);
            };

            drawCatCapsule(450, panelY + 220, "Setup (Kurulum)", "Ince ayarlar ve carpanlar", "#e74c3c");
            drawCatCapsule(450, panelY + 310, "Filter (Filtre)", "Takip disi birakilan uye/rol", "#e67e22");
            drawCatCapsule(450, panelY + 400, "Help (Yardim)", "Kullanim kilavuzunu acar", "#f1c40f");

            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px sans-serif";
            ctx.fillText("ISTATISTIK SISTEMI", 810, panelY + 110);
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.font = "14px sans-serif";
            ctx.fillText("Kullanicilarin ses kanallarindaki,", 810, panelY + 140);
            ctx.fillText("mesaj odalarindaki ve davetlerindeki", 810, panelY + 160);
            ctx.fillText("aktifliklerini takip eden moduller.", 810, panelY + 180);

            drawCatCapsule(810, panelY + 220, "Stats (Istatistik)", "Kisisel ses ve mesaj durumunuz", "#3498db");
            drawCatCapsule(810, panelY + 310, "Top (Liderlik)", "Sunucu geneli aktiflik siralamasi", "#2ecc71");
            drawCatCapsule(810, panelY + 400, "Invites (Davetlerim)", "Davet sayilari ve bonus veriler", "#9b59b6");
            ctx.restore();
        } else if (data.category === "root") {
            drawCommandItem(450, panelY + 110, "setup", "Botun tum ses odasi, log kanali, carpanlar, yetkili roller gibi dinamik ayarlarini oyun icinden yonetmenizi saglayan 3D gorsel kurulum paneli.", "setup", "#e74c3c");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(450, panelY + 235);
            ctx.lineTo(750, panelY + 235);
            ctx.stroke();
            drawCommandItem(450, panelY + 265, "setup [alt_komut]", "Orn: '.setup botkanal' gibi komut satirindan direkt ayarlama yapmanizi da saglar.", "setup [alt_komut] [parametre]", "#e74c3c");

            drawCommandItem(810, panelY + 110, "filter", "Istatistik takibinden muaf tutulan filtre listesindeki kullanicilari, kanallari ve rolleri gosteren 3 cam panelli dashboard kartini cizer.", "filter", "#e67e22");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(810, panelY + 235);
            ctx.lineTo(1110, panelY + 235);
            ctx.stroke();
            drawCommandItem(810, panelY + 265, "filter [ekle/sil] [etiket]", "Belirtilen uyeyi, ses/yazi kanalini veya rolu istatistik filtre listesine ekler veya kaldirir.", "filter ekle @uye", "#e67e22");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(810, panelY + 380);
            ctx.lineTo(1110, panelY + 380);
            ctx.stroke();
            drawCommandItem(810, panelY + 410, "yardim", "Su anda goruntulemekte oldugunuz, etkilesimli premium yardim ve kullanim kilavuzu menusunu acar.", "yardim", "#f1c40f");
        } else if (data.category === "stats") {
            drawCommandItem(450, panelY + 105, "stats [@uye]", "Ses ve mesaj aktiflik verilerinizi, donemsel aktiflik trendlerini premium 3D cam panel uzerinde gosterir.", "stats [@kullanici]", "#3498db");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(450, panelY + 205);
            ctx.lineTo(750, panelY + 205);
            ctx.stroke();
            drawCommandItem(450, panelY + 230, "top", "Sunucuda ses kanallarinda en aktif olan ve en cok mesaj gonderen uyelerin liderlik siralamasini sik bir tasarim ile cizer.", "top", "#2ecc71");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(450, panelY + 325);
            ctx.lineTo(750, panelY + 325);
            ctx.stroke();
            drawCommandItem(450, panelY + 350, "invites [@uye]", "Kullanicinin gercek, fake, ayrilan ve bonus davet istatistikleri ile net davet sayisini Glassmorphic davet kartinda gosterir.", "invites [@kullanici]", "#9b59b6");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(450, panelY + 445);
            ctx.lineTo(750, panelY + 445);
            ctx.stroke();
            drawCommandItem(450, panelY + 470, "voicedetail [@uye]", "Ses kanallarindaki en detayli aktiflik surelerinizi ve odalara gore dagilimini detayli bir sekilde listeler.", "voicedetail [@kullanici]", "#3498db");

            drawCommandItem(810, panelY + 105, "server", "Sunucunun genel ses ve mesaj aktiflik istatistik paneline erisim saglar. Sunucu geneli aktifligi gosterir.", "server", "#e67e22");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(810, panelY + 205);
            ctx.lineTo(1110, panelY + 205);
            ctx.stroke();
            drawCommandItem(810, panelY + 230, "channel [#kanal]", "Belirli bir ses veya yazi kanalindaki istatistiklerinizi ve o kanaldaki aktif uyeleri detaylandirir.", "channel [#kanal]", "#e74c3c");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(810, panelY + 325);
            ctx.lineTo(1110, panelY + 325);
            ctx.stroke();
            drawCommandItem(810, panelY + 350, "staffstats [@uye]", "Sunucudaki yetkililerin ses/mesaj aktifliklerini ve haftalik calisma performans raporunu gorsel tablo olarak cizer.", "staffstats [@kullanici]", "#1abc9c");
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.moveTo(810, panelY + 445);
            ctx.lineTo(1110, panelY + 445);
            ctx.stroke();
            drawCommandItem(810, panelY + 470, "topinvite", "Sunucudaki en cok davet yapan uyelerin genel siralamasini sik bir liderlik tablosu olarak listeler.", "topinvite", "#9b59b6");
        }

        return canvas.toBuffer("image/png");
    }

    static drawGlassPanel(ctx, x, y, w, h, r) {
        ctx.save();
        ctx.fillStyle = BotSettings.CanvasColors.cardBg;
        ctx.beginPath();
        this.drawRoundedRect(ctx, x, y, w, h, r);
        ctx.fill();
        const strokeGrad = ctx.createLinearGradient(x, y, x + w, y + h);
        strokeGrad.addColorStop(0, "rgba(0, 242, 254, 0.15)");
        strokeGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.03)");
        strokeGrad.addColorStop(1, "rgba(127, 0, 255, 0.1)");
        ctx.strokeStyle = strokeGrad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.drawRoundedRect(ctx, x, y, w, h, r);
        ctx.stroke();
        ctx.restore();
    }

    static drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    static formatDuration(seconds) {
        if (seconds <= 0) return "0 dk";
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        let result = "";
        if (days > 0) result += `${days}g `;
        if (hours > 0) result += `${hours}s `;
        if (minutes > 0 || result === "") result += `${minutes}dk`;
        return result.trim();
    }
}

module.exports = { CanvasHelper };

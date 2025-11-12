const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.criarPorteiro = functions.https.onCall(async (data, context) => {
  // Verifica se o usuário que está chamando a função é um admin
  if (context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Apenas administradores podem criar novos porteiros."
    );
  }

  const { email, senha, nome, whatsapp, condominioId } = data;

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: senha,
      displayName: nome,
    });

    await admin.firestore().collection("porteiros").doc(userRecord.uid).set({
      uid: userRecord.uid,
      nome: nome,
      email: email,
      whatsapp: whatsapp,
      condominioId: condominioId,
      role: "porteiro",
      ativo: true,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid };
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      throw new functions.https.HttpsError(
        "already-exists",
        "Este email já está em uso."
      );
    }
    throw new functions.https.HttpsError(
      "internal",
      "Erro ao criar porteiro."
    );
  }
});

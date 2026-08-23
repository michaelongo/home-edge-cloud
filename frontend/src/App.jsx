import {
  useCallback,
  useEffect,
  useState
} from "react";


const API =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


function App() {

  // ==================================================
  // STATE
  // ==================================================
  const [user, setUser] = useState(null);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultKey, setVaultKey] = useState(null);

  const [vaultFiles, setVaultFiles] = useState([]);

  const [vaultUnlocked, setVaultUnlocked] =
  useState(false);
  const [devices, setDevices] = useState([]);
  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [token, setToken] =
    useState(
      localStorage.getItem("token")
    );

  const [files, setFiles] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [online, setOnline] =
    useState(
      navigator.onLine
    );

  const [storageNode, setStorageNode] =
    useState(null);
  const [storageQuota, setStorageQuota] =
  useState(null);

// ==================================================
// NETWORK STATUS
// ==================================================

useEffect(() => {

  function updateStatus() {

    setOnline(navigator.onLine);

  }

  window.addEventListener(
    "online",
    updateStatus
  );

  window.addEventListener(
    "offline",
    updateStatus
  );

  updateStatus();

  return () => {

    window.removeEventListener(
      "online",
      updateStatus
    );

    window.removeEventListener(
      "offline",
      updateStatus
    );

  };

}, []);
  // ==================================================
// BACKEND CONNECTIVITY CHECK
// ==================================================

useEffect(() => {

  if (!token) {
    return;
  }

  let cancelled = false;

  async function checkBackendConnection() {

    try {

      const response = await fetch(
        `${API}/health`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

      if (!cancelled) {

        setOnline(
          response.ok
        );

      }

    } catch {

      if (!cancelled) {

        setOnline(false);

      }

    }

  }

  checkBackendConnection();

  const interval =
    setInterval(
      checkBackendConnection,
      5000
    );

  return () => {

    cancelled = true;

    clearInterval(interval);

  };

}, [token]);
  // ==================================================
  // INDEXEDDB
  // ==================================================

  const openDatabase =
    useCallback(() => {

      return new Promise(
        (resolve, reject) => {

          const request =
  indexedDB.open(
    "HomeEdgeCloud",
    2
  );


          request.onupgradeneeded = () => {

  const db = request.result;


  // ==================================================
  // OFFLINE UPLOAD QUEUE
  // ==================================================

  if (
    !db.objectStoreNames.contains("queue")
  ) {

    db.createObjectStore(
      "queue",
      {
        keyPath: "id",
        autoIncrement: true
      }
    );

  }

  
  // ==================================================
  // EMERGENCY VAULT FILES
  // ==================================================

  if (
    !db.objectStoreNames.contains("vault")
  ) {

    const vaultStore =
      db.createObjectStore(
        "vault",
        {
          keyPath: "id",
          autoIncrement: true
        }
      );

    vaultStore.createIndex(
      "filename",
      "filename",
      {
        unique: false
      }
    );

    vaultStore.createIndex(
      "createdAt",
      "createdAt",
      {
        unique: false
      }
    );

  }

  
  // ==================================================
  // ENCRYPTED VAULT KEY
  // ==================================================

  if (
    !db.objectStoreNames.contains("vaultKey")
  ) {

    db.createObjectStore(
      "vaultKey",
      {
        keyPath: "id"
      }
    );

  }

};


          request.onsuccess =
            () => {

              resolve(
                request.result
              );

            };


          request.onerror =
            () => {

              reject(
                request.error
              );

            };

        }
      );

    }, []);


  // ==================================================
  // LOAD FILES
  // ==================================================

  const loadFiles =
    useCallback(
      async () => {

        if (!token) {
          return;
        }


        try {

          const response =
            await fetch(
              `${API}/files`,
              {
                method: "GET",

                headers: {
                  Authorization:
                    `Bearer ${token}`
                }
              }
            );


          if (!response.ok) {

            throw new Error(
              "Unable to load files"
            );

          }


          const data =
            await response.json();


          setFiles(data);


        } catch (error) {

          console.error(
            "Load files error:",
            error
          );


          setMessage(
            "Cloud unavailable"
          );

        }

      },
      [token]
    );


// ==================================================
// LOAD VAULT FILES
// ==================================================

async function loadVaultFiles() {

  try {

    const database =
      await openDatabase();


    const transaction =
      database.transaction(
        ["vault"],
        "readonly"
      );


    const request =
      transaction
        .objectStore("vault")
        .getAll();


    request.onsuccess =
      () => {

        setVaultFiles(
          request.result
        );

      };


  } catch (error) {

    console.error(
      "Load vault files error:",
      error
    );

    setMessage(
      "Unable to load vault files"
    );

  }

}

// ==================================================
// UNLOCK EMERGENCY VAULT
// ==================================================

async function unlockVault(password) {

  try {

    const database =
      await openDatabase();

    const transaction =
      database.transaction(
        ["vaultKey"],
        "readonly"
      );

    const request =
      transaction
        .objectStore("vaultKey")
        .get("main");

    request.onsuccess = async () => {

      const record =
        request.result;

      if (!record) {

        setMessage(
          "Emergency Vault has not been created"
        );

        return;

      }

      try {

        const key =
          await unprotectVaultKey(
            record,
            password
          );

        setVaultKey(key);

        setVaultUnlocked(true);
        setVaultPassword("");

        await loadVaultFiles();

        setMessage(
          "Emergency Vault unlocked"
        );

      } catch (error) {

        console.error(
          "Vault password error:",
          error
        );

        setMessage(
          "Incorrect vault password"
        );

      }

    };

    request.onerror = () => {

      setMessage(
        "Unable to access Emergency Vault"
      );

    };

  } catch (error) {

    console.error(
      "Vault unlock error:",
      error
    );

    setMessage(
      "Unable to unlock Emergency Vault"
    );

  }

}
// ==================================================
// LOCK EMERGENCY VAULT
// ==================================================

function lockVault() {

  setVaultKey(null);

  setVaultUnlocked(false);

  setVaultPassword("");

  setMessage(
    "Emergency Vault locked"
  );

}

// ==================================================
// UPLOAD FILE TO EMERGENCY VAULT
// ==================================================

async function uploadToVault(event) {

  const file =
    event.target.files[0];

  if (!file) {
    return;
  }

  if (
    !vaultUnlocked ||
    !vaultKey
  ) {

    setMessage(
      "Unlock the Emergency Vault first"
    );

    event.target.value = "";

    return;

  }

  try {

    setMessage(
      `Encrypting ${file.name}...`
    );

    const encrypted =
      await encryptVaultFile(
        file,
        vaultKey
      );

    const database =
      await openDatabase();

    const transaction =
      database.transaction(
        ["vault"],
        "readwrite"
      );

    transaction
      .objectStore("vault")
      .add({

        filename:
          file.name,

        mimeType:
          file.type,

        size:
          file.size,

        encryptedData:
          encrypted.encryptedData,

        iv:
          encrypted.iv,

        createdAt:
          new Date().getTime()

      });

    transaction.oncomplete = async () => {

      await loadVaultFiles();

      setMessage(
        `${file.name} encrypted and stored in Emergency Vault`
      );

    };

    transaction.onerror = () => {

      setMessage(
        "Unable to store encrypted file"
      );

    };

  } catch (error) {

    console.error(
      "Vault upload error:",
      error
    );

    setMessage(
      "Vault encryption failed"
    );

  }

  event.target.value = "";

}
// ==================================================
// EMERGENCY VAULT - CRYPTO HELPERS
// ==================================================

async function generateVaultKey() {

  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    [
      "encrypt",
      "decrypt"
    ]
  );

}


async function encryptVaultFile(
  file,
  key
) {

  const data =
    await file.arrayBuffer();

  const iv =
    window.crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encryptedData =
    await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      data
    );

  return {

    encryptedData,

    iv:
      Array.from(iv)

  };

}
async function downloadVaultFile(
  vaultFile
) {

  if (
    !vaultUnlocked ||
    !vaultKey
  ) {

    setMessage(
      "Unlock the Emergency Vault first"
    );

    return;

  }

  try {

    setMessage(
      `Decrypting ${vaultFile.filename}...`
    );

    const decryptedData =
      await decryptVaultFile(
        vaultFile.encryptedData,
        vaultFile.iv,
        vaultKey
      );

    const blob =
      new Blob(
        [decryptedData],
        {
          type:
            vaultFile.mimeType ||
            "application/octet-stream"
        }
      );

    const url =
      window.URL.createObjectURL(
        blob
      );

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      vaultFile.filename;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    window.URL.revokeObjectURL(
      url
    );

    setMessage(
      `${vaultFile.filename} decrypted successfully`
    );

  } catch (error) {

    console.error(
      "Vault decryption error:",
      error
    );

    setMessage(
      "Unable to decrypt vault file"
    );

  }

}
async function deleteVaultFile(
  fileId
) {

  if (
    !vaultUnlocked
  ) {

    setMessage(
      "Unlock the Emergency Vault first"
    );

    return;

  }

  const confirmed =
    window.confirm(
      "Permanently delete this vault file?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const database =
      await openDatabase();

    const transaction =
      database.transaction(
        ["vault"],
        "readwrite"
      );

    transaction
      .objectStore("vault")
      .delete(fileId);

    transaction.oncomplete = async () => {

      await loadVaultFiles();

      setMessage(
        "Vault file permanently deleted"
      );

    };

  } catch (error) {

    console.error(
      "Vault deletion error:",
      error
    );

    setMessage(
      "Unable to delete vault file"
    );

  }

}

async function decryptVaultFile(
  encryptedData,
  iv,
  key
) {

  return await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv)
    },
    key,
    encryptedData
  );

}
// ==================================================
// VAULT PASSWORD KEY DERIVATION
// ==================================================

async function deriveVaultKey(
  password,
  salt
) {

  const encoder =
    new TextEncoder();

  const passwordData =
    encoder.encode(password);

  const baseKey =
    await window.crypto.subtle.importKey(
      "raw",
      passwordData,
      "PBKDF2",
      false,
      [
        "deriveKey"
      ]
    );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    [
      "encrypt",
      "decrypt"
    ]
  );
}
// ==================================================
// CREATE EMERGENCY VAULT
// ==================================================

async function createVault(password) {

  if (!password || password.length < 6) {

    setMessage(
      "Vault password must contain at least 6 characters"
    );

    return;

  }

  try {

    const database =
      await openDatabase();

    const readTransaction =
      database.transaction(
        ["vaultKey"],
        "readonly"
      );

    const request =
      readTransaction
        .objectStore("vaultKey")
        .get("main");

    request.onsuccess = async () => {

      if (request.result) {

        setMessage(
          "Emergency Vault already exists"
        );

        return;

      }

      try {

        const key =
          await generateVaultKey();

        const protectedKey =
          await protectVaultKey(
            key,
            password
          );

        const writeTransaction =
          database.transaction(
            ["vaultKey"],
            "readwrite"
          );

        writeTransaction
          .objectStore("vaultKey")
          .put({

            id: "main",

            encryptedKey:
              protectedKey.encryptedKey,

            salt:
              protectedKey.salt,

            iv:
              protectedKey.iv,

            createdAt:
              Date.now()

          });

        writeTransaction.oncomplete = () => {

          setVaultKey(key);

          setVaultUnlocked(true);

          setVaultFiles([]);

          setMessage(
            "Emergency Vault created successfully"
          );

        };

      } catch (error) {

        console.error(
          "Vault creation error:",
          error
        );

        setMessage(
          "Unable to create Emergency Vault"
        );

      }

    };

  } catch (error) {

    console.error(
      "Vault database error:",
      error
    );

    setMessage(
      "Unable to access Emergency Vault"
    );

  }

}
// ==================================================
// PROTECT VAULT KEY
// ==================================================

async function protectVaultKey(
  vaultKey,
  password
) {

  const salt =
    window.crypto.getRandomValues(
      new Uint8Array(16)
    );

  const passwordKey =
    await deriveVaultKey(
      password,
      salt
    );

  const rawVaultKey =
    await window.crypto.subtle.exportKey(
      "raw",
      vaultKey
    );

  const iv =
    window.crypto.getRandomValues(
      new Uint8Array(12)
    );

  const encryptedKey =
    await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      passwordKey,
      rawVaultKey
    );

  return {
    encryptedKey: Array.from(
      new Uint8Array(encryptedKey)
    ),

    salt: Array.from(salt),

    iv: Array.from(iv)
  };
}
// ==================================================
// UNPROTECT VAULT KEY
// ==================================================

async function unprotectVaultKey(
  record,
  password
) {

  const salt =
    new Uint8Array(
      record.salt
    );

  const iv =
    new Uint8Array(
      record.iv
    );

  const passwordKey =
    await deriveVaultKey(
      password,
      salt
    );

  const encryptedKey =
    new Uint8Array(
      record.encryptedKey
    );

  const rawVaultKey =
    await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      passwordKey,
      encryptedKey
    );

  return await window.crypto.subtle.importKey(
    "raw",
    rawVaultKey,
    {
      name: "AES-GCM"
    },
    true,
    [
      "encrypt",
      "decrypt"
    ]
  );
}

// ==================================================
// LOAD CURRENT USER
// ==================================================

const loadUser = useCallback(
  async () => {

    if (!token) {
      return;
    }

    try {

      const response =
        await fetch(
          `${API}/me`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      if (!response.ok) {

        throw new Error(
          "Unable to load user"
        );

      }

      const data =
        await response.json();

      setUser(data);

    } catch (error) {

      console.error(
        "User loading error:",
        error
      );

    }

  },
  [token]
);

  // ==================================================
// LOAD TRUSTED DEVICES
// ==================================================

const loadDevices = useCallback(
  async () => {

    if (!token || !navigator.onLine) {
      return;
    }

    try {

      const response =
        await fetch(
          `${API}/devices`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );

      if (!response.ok) {

        throw new Error(
          "Unable to load trusted devices"
        );

      }

      const data =
        await response.json();

      setDevices(data);

    } catch (error) {

      console.error(
        "Device loading error:",
        error
      );

      setMessage(
        "Unable to load trusted devices"
      );

    }

  },
  [token]
);
// ==================================================
// REGISTER TRUSTED DEVICE
// ==================================================

async function registerDevice() {

  try {

    const deviceIdentifier =
      localStorage.getItem(
        "device_identifier"
      ) ||
      crypto.randomUUID();


    localStorage.setItem(
      "device_identifier",
      deviceIdentifier
    );


    const response =
      await fetch(
        `${API}/devices`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`
          },

          body: JSON.stringify({

            device_name:
              `${navigator.platform} Device`,

            device_type:
              "browser",

            device_identifier:
              deviceIdentifier

          })
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Device registration failed"
      );

    }


    setMessage(
      "Device registered successfully"
    );


    await loadDevices();

  }
  catch (error) {

    console.error(
      "Device registration error:",
      error
    );


    setMessage(
      "Device registration failed: " +
      error.message
    );

  }

}
// ==================================================
// REMOVE TRUSTED DEVICE
// ==================================================

async function removeDevice(deviceId) {

  if (
    !window.confirm(
      "Remove this trusted device?"
    )
  ) {

    return;

  }


  try {

    const response =
      await fetch(
        `${API}/devices/${deviceId}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Unable to remove device"
      );

    }


    setMessage(
      "Trusted device removed"
    );


    await loadDevices();

  }
  catch (error) {

    console.error(
      "Device removal error:",
      error
    );


    setMessage(
      "Device removal failed: " +
      error.message
    );

  }

}
  // ==================================================
  // CHECK STORAGE NODE
  // ==================================================

  // ==================================================
// CHECK STORAGE STATUS
// ==================================================

const checkStorageNode = useCallback(
  async () => {

    if (!token || !navigator.onLine) {
      return;
    }

    try {

      const response = await fetch(
        `${API}/storage/status`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {

        throw new Error(
          "Storage status unavailable"
        );

      }

      const data =
        await response.json();

      setStorageNode(data);

    } catch (error) {

      console.error(
        "Storage status error:",
        error
      );

      setStorageNode(null);
    }

  },
  [token]
);

// ==================================================
// CHECK STORAGE QUOTA
// ==================================================

const checkStorageQuota = useCallback(
  async () => {

    if (!token) {
      console.log("No token available");
      return;
    }

    console.log(
      "Token being sent:",
      token
    );

    try {

      const response = await fetch(
        `${API}/storage/quota`,
        {
          method: "GET",

          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      console.log(
        "Quota response status:",
        response.status
      );

      const data =
        await response.json();

      console.log(
        "Quota response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.detail ||
          "Unable to load storage quota"
        );
      }

      setStorageQuota(data);

    } catch (error) {

      console.error(
        "Storage quota error:",
        error
      );

      setStorageQuota(null);
    }

  },
  [token]
);
  // ==================================================
  // STORAGE AVAILABILITY
  // ==================================================

const isStorageAvailable =
  useCallback(
    async () => {

      if (!token) {
        return false;
      }

      try {

        const response =
          await fetch(
            `${API}/storage/status`,
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        if (!response.ok) {
          return false;
        }

        const status =
          await response.json();

        return (
          status.any_available === true
        );

      } catch (error) {

        console.error(
          "Storage availability error:",
          error
        );

        return false;
      }

    },
    [token]
  );


  // ==================================================
  // LOAD DATA AFTER LOGIN
  // ==================================================

useEffect(() => {

  if (
    !token ||
    !online
  ) {
    return;
  }

  const timer =
    setTimeout(() => {

      loadUser();
      loadFiles();
      

      checkStorageNode();

      checkStorageQuota();
      loadDevices();

    }, 0);

  return () => {

    clearTimeout(timer);

  };

}, [
  token,
  online,
  loadUser,
  loadFiles,
  checkStorageNode,
  checkStorageQuota,
  loadDevices
]);


  // ==================================================
  // LOGIN
  // ==================================================

  async function login(event) {

    event.preventDefault();


    try {

      const formData =
        new URLSearchParams();


      formData.append(
        "username",
        username
      );


      formData.append(
        "password",
        password
      );


      const response =
        await fetch(
          `${API}/login`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded"
            },

            body: formData
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Login failed"
        );

      }


      localStorage.setItem(
        "token",
        data.access_token
      );


      setToken(
        data.access_token
      );


      setMessage(
        "Login successful"
      );


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      setMessage(
        "Login failed: " +
        error.message
      );

    }

  }


  // ==================================================
  // SAVE FILE TO OFFLINE QUEUE
  // ==================================================

  const saveToOfflineQueue =
    useCallback(
      async (file) => {

        const database =
          await openDatabase();


        const transaction =
          database.transaction(
            ["queue"],
            "readwrite"
          );


        transaction
          .objectStore("queue")
          .add({

            name:
              file.name,

            type:
              file.type,

            size:
              file.size,

            file:
              file,

            status:
              "WAITING_FOR_NODE",

            retryCount:
              0,

            createdAt:
              Date.now(),

            lastAttempt:
              null

          });

      },
      [openDatabase]
    );


  // ==================================================
  // UPLOAD FILE
  // ==================================================

  async function uploadFile(event) {

    const file =
      event.target.files[0];


    if (!file) {

      return;

    }


    // ----------------------------------------------
    // INTERNET OFF
    // ----------------------------------------------

    if (!online) {

  await saveToOfflineQueue(file);

  setMessage(
    `${file.name} added to offline queue`
  );

  event.target.value = "";

  return;
}


    // ----------------------------------------------
    // STORAGE CHECK
    // ----------------------------------------------

    const storageAvailable =
      await isStorageAvailable();


    if (!storageAvailable) {

      await saveToOfflineQueue(
        file
      );


      setMessage(
        `${file.name} queued - storage node unavailable`
      );


      event.target.value = "";

      return;

    }


    // ----------------------------------------------
    // UPLOAD
    // ----------------------------------------------

    try {

      const formData =
        new FormData();


      formData.append(
        "upload",
        file
      );


      const response =
        await fetch(
          `${API}/files/upload`,
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${token}`
            },

            body:
              formData
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Upload failed"
        );

      }


      setMessage(
  `${file.name} uploaded successfully`
);

await loadFiles();
await loadUser();
await checkStorageQuota();

      await checkStorageNode();


    } catch (error) {

      console.error(
        "Upload error:",
        error
      );


      await saveToOfflineQueue(
        file
      );


      setMessage(
        `${file.name} queued for synchronization`
      );

    }


    event.target.value = "";

  }


  // ==================================================
  // SYNCHRONIZE OFFLINE QUEUE
  // ==================================================

  const synchronizeQueue =
    useCallback(
      async () => {

        if (!token) {

          return;

        }


        if (!navigator.onLine) {

          return;

        }


        // ------------------------------------------
        // CHECK STORAGE
        // ------------------------------------------

        const storageAvailable =
          await isStorageAvailable();


        if (!storageAvailable) {

          setMessage(
            "Storage node unavailable - queue waiting"
          );

          return;

        }


        // ------------------------------------------
        // OPEN DATABASE
        // ------------------------------------------

        const database =
          await openDatabase();


        const transaction =
          database.transaction(
            ["queue"],
            "readonly"
          );


        const request =
          transaction
            .objectStore("queue")
            .getAll();


        const queuedFiles =
          await new Promise(
            (resolve, reject) => {

              request.onsuccess =
                () => {

                  resolve(
                    request.result
                  );

                };


              request.onerror =
                () => {

                  reject(
                    request.error
                  );

                };

            }
          );


        if (
          queuedFiles.length === 0
        ) {

          return;

        }


        setMessage(
          `Synchronizing ${queuedFiles.length} queued file(s)...`
        );


        // ------------------------------------------
        // PROCESS ONE FILE AT A TIME
        // ------------------------------------------

        for (
          const item of queuedFiles
        ) {

          try {

            // --------------------------------------
            // MARK UPLOADING
            // --------------------------------------

            item.status =
              "UPLOADING";

            item.lastAttempt =
              Date.now();


            let updateTransaction =
              database.transaction(
                ["queue"],
                "readwrite"
              );


            updateTransaction
              .objectStore("queue")
              .put(item);


            // --------------------------------------
            // CREATE FORM DATA
            // --------------------------------------

            const formData =
              new FormData();


            formData.append(
              "upload",
              item.file
            );


            // --------------------------------------
            // UPLOAD
            // --------------------------------------

            const response =
              await fetch(
                `${API}/files/upload`,
                {
                  method: "POST",

                  headers: {
                    Authorization:
                      `Bearer ${token}`
                  },

                  body:
                    formData
                }
              );


            // --------------------------------------
            // UPLOAD FAILED
            // --------------------------------------

            if (!response.ok) {

              item.status =
                "FAILED";


              item.retryCount =
                (item.retryCount || 0) + 1;


              updateTransaction =
                database.transaction(
                  ["queue"],
                  "readwrite"
                );


              updateTransaction
                .objectStore("queue")
                .put(item);


              continue;

            }


            // --------------------------------------
            // UPLOAD SUCCESSFUL
            // --------------------------------------

            item.status =
              "STORED";


            updateTransaction =
              database.transaction(
                ["queue"],
                "readwrite"
              );


            updateTransaction
              .objectStore("queue")
              .put(item);


            // --------------------------------------
            // REMOVE FROM QUEUE
            // --------------------------------------

            const deleteTransaction =
              database.transaction(
                ["queue"],
                "readwrite"
              );


            deleteTransaction
              .objectStore("queue")
              .delete(
                item.id
              );


          } catch (error) {

            console.error(
              "Synchronization error:",
              error
            );


            item.status =
              "FAILED";


            item.retryCount =
              (item.retryCount || 0) + 1;


            try {

              const failedTransaction =
                database.transaction(
                  ["queue"],
                  "readwrite"
                );


              failedTransaction
                .objectStore("queue")
                .put(item);

            } catch (dbError) {

              console.error(
                "Queue update error:",
                dbError
              );

            }

          }

        }


        await loadFiles();

        await checkStorageNode();


        setMessage(
          "Synchronization completed"
        );

      },
      [
        token,
        openDatabase,
        isStorageAvailable,
        loadFiles,
        checkStorageNode
      ]
    );


  // ==================================================
  // AUTOMATIC SYNCHRONIZATION
  // ==================================================

  useEffect(() => {

    if (
      !online ||
      !token
    ) {

      return;

    }


    const timer =
      setTimeout(() => {

        synchronizeQueue();

      }, 500);


    return () => {

      clearTimeout(
        timer
      );

    };

  }, [
    online,
    token,
    synchronizeQueue
  ]);


  // ==================================================
  // DOWNLOAD FILE
  // ==================================================

  async function downloadFile(
    fileId,
    filename
  ) {

    try {

      const response =
        await fetch(
          `${API}/files/${fileId}/download`,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );


      if (!response.ok) {

        throw new Error(
          "Download failed"
        );

      }


      const blob =
        await response.blob();


      const url =
        window.URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.download =
        filename;


      document.body.appendChild(
        link
      );


      link.click();


      link.remove();


      window.URL.revokeObjectURL(
        url
      );


      setMessage(
        `${filename} downloaded`
      );


    } catch (error) {

      console.error(
        "Download error:",
        error
      );


      setMessage(
        "Download failed"
      );

    }

  }
  // ==================================================
// VERIFY FILE INTEGRITY
// ==================================================

async function verifyFile(fileId, filename) {

  try {

    const response =
      await fetch(
        `${API}/files/${fileId}/verify`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.detail ||
        "Integrity verification failed"
      );

    }


    if (data.valid) {

      setMessage(
        `✓ ${filename} integrity verified`
      );

    } else {

      setMessage(
        `⚠ ${filename} has been modified or corrupted`
      );

    }

  }
  catch (error) {

    console.error(
      "Integrity verification error:",
      error
    );


    setMessage(
      "Integrity verification failed: " +
      error.message
    );

  }

}

  // ==================================================
  // DELETE FILE
  // ==================================================

  async function deleteFile(
    fileId
  ) {

    if (
      !window.confirm(
        "Delete this file?"
      )
    ) {

      return;

    }


    try {

      const response =
        await fetch(
          `${API}/files/${fileId}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`
            }
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Delete failed"
        );

      }


      setMessage(
  "File deleted successfully"
);

await loadFiles();
await checkStorageQuota();
await loadUser();

      await checkStorageNode();


    } catch (error) {

      console.error(
        "Delete error:",
        error
      );


      setMessage(
        "Delete failed: " +
        error.message
      );

    }

  }

  // ==================================================
// FORMAT STORAGE SIZE
// ==================================================

function formatBytes(bytes) {

  if (
    bytes === null ||
    bytes === undefined
  ) {
    return "0 B";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];

  const i =
    Math.floor(
      Math.log(bytes) /
      Math.log(1024)
    );

  return (
    (bytes /
      Math.pow(1024, i)
    ).toFixed(2)
    + " "
    + units[i]
  );
}
  // ==================================================
  // LOGOUT
  // ==================================================

  function logout() {

    localStorage.removeItem(
      "token"
    );


    setToken(null);

    setFiles([]);

    setUsername("");

    setPassword("");

    setMessage(
      "Logged out"
    );

  }


  // ==================================================
  // LOGIN SCREEN
  // ==================================================

  if (!token) {

    return (

      <div className="container">

        <h1>
          Home Edge Cloud
        </h1>


        <p>
          Private family cloud storage
        </p>
        {user && (
  <p>
    Account: <strong>{user.username}</strong>
  </p>
)}

        <form
          onSubmit={login}
        >

          <input
            placeholder="Username"
            value={username}
            onChange={
              (event) =>
                setUsername(
                  event.target.value
                )
            }
          />


          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={
              (event) =>
                setPassword(
                  event.target.value
                )
            }
          />


          <button
            type="submit"
          >
            Login
          </button>

        </form>


        <p>
          {message}
        </p>

      </div>

    );

  }


  // ==================================================
  // STORAGE STATUS TEXT
  // ==================================================

  let storageStatus =
    "🔴 Storage Node Unavailable";


  if (!online) {

    storageStatus =
      "🔴 Network Offline";

  } else if (
    storageNode?.ssd?.online &&
    storageNode?.hdd?.online
  ) {

    storageStatus =
      "🟢 SSD + HDD Online";

  } else if (
    storageNode?.ssd?.online
  ) {

    storageStatus =
      "🟡 SSD Online / HDD Offline";

  } else if (
    storageNode?.hdd?.online
  ) {

    storageStatus =
      "🟡 HDD Online / SSD Offline";

  } else if (
    storageNode?.any_available
  ) {

    storageStatus =
      "🟢 Storage Available";

  }


  // ==================================================
  // DASHBOARD
  // ==================================================

  return (

    <div className="container">

      <h1>
        Home Edge Cloud
      </h1>


      <p>
        Private family cloud storage
      </p>

      {/* ==================================================
    EMERGENCY VAULT
================================================== */}

<hr />

<h2>
  🔐 Emergency Vault
</h2>

{!vaultUnlocked ? (

  <div>

    <p>
      Vault is locked.
    </p>

    <input
  type="password"
  placeholder="Vault password"
  value={vaultPassword}
  onChange={(e) => setVaultPassword(e.target.value)}
/>

    <button
  onClick={() => {
    unlockVault(vaultPassword);
  }}
>
  Unlock Vault
</button>

    <button
  onClick={() => {
    createVault(vaultPassword);
  }}
>
  Create Vault
</button>

  </div>

) : (

  <div>

    <p>
      🟢 Emergency Vault Unlocked
    </p>

    <input
      type="file"
      onChange={uploadToVault}
    />

    <button
      onClick={lockVault}
    >
      🔒 Lock Vault
    </button>

    <h3>
      Encrypted Vault Files
    </h3>

    {vaultFiles.length === 0 ? (

      <p>
        No emergency files stored.
      </p>

    ) : (

      <ul>

        {vaultFiles.map(
          (vaultFile) => (

            <li
              key={vaultFile.id}
            >

              🔐 {vaultFile.filename}

              {" - "}

              {vaultFile.size} bytes

              {" "}

              <button
                onClick={() =>
                  downloadVaultFile(
                    vaultFile
                  )
                }
              >
                Decrypt & Download
              </button>

              {" "}

              <button
                onClick={() =>
                  deleteVaultFile(
                    vaultFile.id
                  )
                }
              >
                Delete
              </button>

            </li>

          )
        )}

      </ul>

    )}

  </div>

)}
      {/* -------------------------------------------- */}
      {/* SYSTEM STATUS */}
      {/* -------------------------------------------- */}

      <div className="status">

        <p>

          <strong>
            Internet:
          </strong>

          {" "}

          {online
            ? "🟢 Online"
            : "🔴 Offline"}

        </p>


        <p>

          <strong>
            Storage Node:
          </strong>

          {" "}

          {storageStatus}

        </p>

      </div>
      {/* ==================================================
    STORAGE DASHBOARD
================================================== */}
{/* ==================================================
    USER STORAGE QUOTA
================================================== */}
<h2>
  My Storage
</h2>

{storageQuota === null ? (

  <p>
    Loading storage quota...
  </p>

) : (

  <div>

    <p>
      <strong>
        Allocated:
      </strong>{" "}
      {formatBytes(storageQuota.quota)}
    </p>

    <p>
      <strong>
        Used:
      </strong>{" "}
      {formatBytes(storageQuota.used_storage)}
    </p>

    <p>
      <strong>
        Remaining:
      </strong>{" "}
      {formatBytes(storageQuota.remaining_storage)}
    </p>

  </div>

)}
<div className="storage-dashboard">

  <h2>
    Storage
  </h2>

  {!storageNode ? (

    <p>
      Storage information unavailable.
    </p>

  ) : (

    <>

      {/* ----------------------------------------------
          SSD
      ---------------------------------------------- */}

      <div className="storage-card">

        <h3>
          SSD
        </h3>

        <p>
          Status:{" "}
          {storageNode.ssd?.online
            ? "🟢 Online"
            : "🔴 Offline"}
        </p>

        {storageNode.ssd?.online && (

          <>

            <p>
              Total:{" "}
              {storageNode.ssd.total_gb} GB
            </p>

            <p>
              Used:{" "}
              {storageNode.ssd.used_gb} GB
            </p>

            <p>
              Free:{" "}
              {storageNode.ssd.free_gb} GB
            </p>

            <progress
              value={
                storageNode.ssd.usage_percent
              }
              max="100"
            />

            <p>
              Usage:{" "}
              {storageNode.ssd.usage_percent}%
            </p>

          </>

        )}

      </div>


      {/* ----------------------------------------------
          HDD
      ---------------------------------------------- */}

      <div className="storage-card">

        <h3>
          HDD
        </h3>

        <p>
          Status:{" "}
          {storageNode.hdd?.online
            ? "🟢 Online"
            : "🔴 Offline"}
        </p>

        {storageNode.hdd?.online && (

          <>

            <p>
              Total:{" "}
              {storageNode.hdd.total_gb} GB
            </p>

            <p>
              Used:{" "}
              {storageNode.hdd.used_gb} GB
            </p>

            <p>
              Free:{" "}
              {storageNode.hdd.free_gb} GB
            </p>

            <progress
              value={
                storageNode.hdd.usage_percent
              }
              max="100"
            />

            <p>
              Usage:{" "}
              {storageNode.hdd.usage_percent}%
            </p>

          </>

        )}

      </div>

    </>

  )}

</div>
{/* ==================================================
    TRUSTED DEVICES
================================================== */}

<div className="devices-section">

  <h2>
    Trusted Devices
  </h2>

  <p>
    {devices.length} / 10 trusted devices
  </p>


  <button
    onClick={registerDevice}
    disabled={devices.length >= 10}
  >
    Register This Device
  </button>


  {devices.length === 0 ? (

    <p>
      No trusted devices registered.
    </p>

  ) : (

    <ul>

      {devices.map(
        (device) => (

          <li
            key={device.id}
          >

            <strong>
              {device.device_name}
            </strong>

            {" — "}

            {device.device_type}

            {" — "}

            {device.trusted
              ? "✓ Trusted"
              : "✗ Not Trusted"}

            {" — "}

            {device.vault_enabled
              ? "🔐 Vault Enabled"
              : "Vault Disabled"}

            {" "}

            <button
              onClick={() =>
                removeDevice(
                  device.id
                )
              }
            >
              Remove
            </button>

          </li>

        )
      )}

    </ul>

  )}

</div>

      {/* -------------------------------------------- */}
      {/* STORAGE INFORMATION */}
      {/* -------------------------------------------- */}

      {storageNode && online && (

        <div>

          <h3>
            Storage Information
          </h3>


          <p>

            <strong>
              SSD:
            </strong>

            {" "}

            {storageNode.ssd?.online
              ? `${storageNode.ssd.free_gb} GB free`
              : "Offline"}

          </p>


          <p>

            <strong>
              HDD:
            </strong>

            {" "}

            {storageNode.hdd?.online
              ? `${storageNode.hdd.free_gb} GB free`
              : "Offline"}

          </p>

        </div>

      )}


      {/* -------------------------------------------- */}
      {/* UPLOAD */}
      {/* -------------------------------------------- */}

      <h2>
        Upload File
      </h2>


      <input
        type="file"
        onChange={uploadFile}
      />


      {/* -------------------------------------------- */}
      {/* REFRESH */}
      {/* -------------------------------------------- */}

      <button
  onClick={() => {

    loadUser();

    loadFiles();

    checkStorageNode();

    checkStorageQuota();

    loadDevices();

  }}
>
  Refresh
</button>


      {/* -------------------------------------------- */}
      {/* FILE LIST */}
      {/* -------------------------------------------- */}

      <h2>
        My Files
      </h2>


      {files.length === 0 ? (

        <p>
          No files stored yet.
        </p>

      ) : (

        <ul>

          {files.map(
            (file) => (

              <li
                key={file.id}
              >

                <strong>
                  {file.filename}
                </strong>

                {" - "}

                {file.size} bytes

                {" - "}

                {file.storage_class}

                {" - "}

                {file.status}


                {" "}


                <button
                  onClick={() =>
                    downloadFile(
                      file.id,
                      file.filename
                    )
                  }
                >
                  Download
                </button>
                {" "}

<button
  onClick={() =>
    verifyFile(
      file.id,
      file.filename
    )
  }
>
  Verify
</button>

                {" "}


                <button
                  onClick={() =>
                    deleteFile(
                      file.id
                    )
                  }
                >
                  Delete
                </button>

              </li>

            )
          )}

        </ul>

      )}


      {/* -------------------------------------------- */}
      {/* MESSAGE */}
      {/* -------------------------------------------- */}

      <p>
        {message}
      </p>


      {/* -------------------------------------------- */}
      {/* LOGOUT */}
      {/* -------------------------------------------- */}

      <button
        onClick={logout}
      >
        Logout
      </button>

    </div>

  );

}


export default App;
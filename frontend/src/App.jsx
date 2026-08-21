import {
  useCallback,
  useEffect,
  useState
} from "react";

const API = "http://127.0.0.1:8000";


function App() {

  // ==================================================
  // STATE
  // ==================================================

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  const [files, setFiles] = useState([]);

  const [message, setMessage] = useState("");

  const [online, setOnline] = useState(
    navigator.onLine
  );

  const [storageNode, setStorageNode] =
    useState(null);


  // ==================================================
  // NETWORK STATUS
  // ==================================================

  useEffect(() => {

    function updateStatus() {

      setOnline(
        navigator.onLine
      );

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
  // OPEN INDEXEDDB
  // ==================================================

  function openDatabase() {

    return new Promise(
      (resolve, reject) => {

        const request =
          indexedDB.open(
            "HomeEdgeCloud",
            1
          );


        request.onupgradeneeded = () => {

          const db =
            request.result;


          // Offline queue

          if (
            !db.objectStoreNames.contains(
              "queue"
            )
          ) {

            db.createObjectStore(
              "queue",
              {
                keyPath: "id",
                autoIncrement: true
              }
            );

          }


          // Emergency vault

          if (
            !db.objectStoreNames.contains(
              "vault"
            )
          ) {

            db.createObjectStore(
              "vault",
              {
                keyPath: "id",
                autoIncrement: true
              }
            );

          }

        };


        request.onsuccess = () => {

          resolve(
            request.result
          );

        };


        request.onerror = () => {

          reject(
            request.error
          );

        };

      }
    );

  }


  // ==================================================
  // LOAD FILES
  // ==================================================

  const loadFiles = useCallback(
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

      }
      catch (error) {

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
  // CHECK STORAGE NODE
  // ==================================================

  const checkStorageNode = useCallback(
    async () => {

      if (!token) {
        return;
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

          throw new Error(
            "Storage node unavailable"
          );

        }


        const data =
          await response.json();


        setStorageNode(
          data
        );

      }
      catch (error) {

        console.error(
          "Storage status error:",
          error
        );

        setStorageNode(
          null
        );

      }

    },
    [token]
  );


  // ==================================================
  // LOAD DATA AFTER LOGIN / ONLINE
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

        loadFiles();

        checkStorageNode();

      }, 0);


    return () => {

      clearTimeout(
        timer
      );

    };

  }, [
    token,
    online,
    loadFiles,
    checkStorageNode
  ]);


  // ==================================================
  // LOGIN
  // ==================================================

  async function login(e) {

    e.preventDefault();


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

    }
    catch (error) {

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

  async function saveToOfflineQueue(
    file
  ) {

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

        name: file.name,

        type: file.type,

        size: file.size,

        file: file,

        status:
          "WAITING_FOR_NODE",

        retryCount: 0,

        createdAt:
          Date.now(),

        lastAttempt:
          null

      });

  }


  // ==================================================
  // CHECK STORAGE BEFORE UPLOAD
  // ==================================================

const isStorageAvailable = useCallback(
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
        status.ssd_online ||
        status.hdd_online
      );

    }
    catch (error) {

      console.error(
        "Storage availability check failed:",
        error
      );

      return false;

    }

  },
  [token]
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

    if (!navigator.onLine) {

      await saveToOfflineQueue(
        file
      );


      setMessage(
        `${file.name} added to offline queue`
      );


      event.target.value = "";

      return;

    }


    // ----------------------------------------------
    // STORAGE NODE CHECK
    // ----------------------------------------------

    const storageAvailable =
      await isStorageAvailable();


    if (!storageAvailable) {

      await saveToOfflineQueue(
        file
      );


      setMessage(
        `${file.name} queued - storage node offline`
      );


      event.target.value = "";

      return;

    }


    // ----------------------------------------------
    // UPLOAD TO CLOUD
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

            body: formData
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

    }
    catch (error) {

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
        // Check storage node
        // ------------------------------------------

        const storageAvailable =
          await isStorageAvailable();


        if (!storageAvailable) {

          setMessage(
            "Storage node offline - queue waiting"
          );

          return;

        }


        // ------------------------------------------
        // Open database
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


        request.onsuccess =
          async () => {

            const queuedFiles =
              request.result;


            if (
              queuedFiles.length === 0
            ) {

              return;

            }


            setMessage(
              `Synchronizing ${queuedFiles.length} queued file(s)...`
            );


            // --------------------------------------
            // Process one file at a time
            // --------------------------------------

            for (
              const item of queuedFiles
            ) {

              try {

                // --------------------------------
                // Mark UPLOADING
                // --------------------------------

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


                // --------------------------------
                // Upload
                // --------------------------------

                const formData =
                  new FormData();


                formData.append(
                  "upload",
                  item.file
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

                      body: formData
                    }
                  );


                // --------------------------------
                // Upload failed
                // --------------------------------

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


                // --------------------------------
                // Upload succeeded
                // --------------------------------

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


                // --------------------------------
                // Remove from queue
                // --------------------------------

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

              }
              catch (error) {

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

                }
                catch {

                  // Keep the item in the queue.

                }

              }

            }


            await loadFiles();


            setMessage(
              "Synchronization completed"
            );

          };

      },
            [
        token,
        loadFiles,
        isStorageAvailable
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

      }, 0);


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
        document.createElement("a");


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

    }
    catch (error) {

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

    }
    catch (error) {

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
  // LOGIN PAGE
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


        <form
          onSubmit={login}
        >

          <input
            placeholder="Username"
            value={username}
            onChange={
              (e) =>
                setUsername(
                  e.target.value
                )
            }
          />


          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={
              (e) =>
                setPassword(
                  e.target.value
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
  // DASHBOARD
  // ==================================================

  return (

    <div className="container">

      <h1>
        Home Edge Cloud
      </h1>


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

          {!online ? (

            "🔴 Network Offline"

          ) : storageNode === null ? (

            "🔴 Storage Node Unavailable"

          ) : storageNode.ssd_online &&
            storageNode.hdd_online ? (

            "🟢 SSD + HDD Online"

          ) : storageNode.ssd_online ? (

            "🟡 SSD Online / HDD Offline"

          ) : storageNode.hdd_online ? (

            "🟡 HDD Online / SSD Offline"

          ) : (

            "🔴 SSD + HDD Offline"

          )}

        </p>

      </div>


      <h2>
        Upload File
      </h2>


      <input
        type="file"
        onChange={uploadFile}
      />


      <button
        onClick={loadFiles}
      >
        Refresh Files
      </button>


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


      <p>
        {message}
      </p>


      <button
        onClick={logout}
      >
        Logout
      </button>

    </div>

  );

}


export default App;
// TODO: let's remove the need for global vars
let responses = [];
let folders = [];
let posts = [];

window.onload = () => {
  const pageHigh = pageHighForFirstPage();
  const lastSynced = getLastSyncedFromLocalStorage();

  folders = getFoldersFromLocalStorage();
  posts = getPostsFromLocalStorage();

  const allFolder = getAllFolder();

  folders.forEach(displayFolder);
  configurePrevNextBtns(false, false);
  displayPostsFromFolder(allFolder, pageHigh);
  updateLastSyncedValue(lastSynced);
};

const pageHighForFirstPage = () => {
  return posts.length > 25 ? 25 : posts.length;
};

const getAllFolder = () => {
  return folders.find((folder) => folder.folderName === "All");
};

const getFoldersFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem("folders")) ?? [];
};

const getPostsFromLocalStorage = () => {
  return JSON.parse(localStorage.getItem("posts")) ?? [];
};

const getLastSyncedFromLocalStorage = () => {
  return localStorage.getItem("lastSynced") ?? "";
};

const updateLastSyncedValue = (lastsyncedValue) => {
  document.querySelector("#lastSyncedVal").innerHTML = lastsyncedValue;
};

const handleSync = () => {
  clearDataForRefresh();
  const emptiedAllFolder = getReinitializedAllFolder();

  folders.push(emptiedAllFolder);

  fetchPosts();
};

const clearDataForRefresh = () => {
  folders = [];
  posts = [];
  responses = [];
};

const getReinitializedAllFolder = () => {
  const allFolder = {
    folderName: "All",
    savedPosts: [],
  };
  return allFolder;
};
const fetchPosts = async (afterParamForURL) => {
  try {
    startSyncAnimation();

    const postsPerRequest = 100;
    const maxPostsToFetch = 1000;
    const maxRequests = maxPostsToFetch / postsPerRequest;
    const URL = generateURLStringForFetch(afterParamForURL, postsPerRequest);
    const response = await fetch(URL);
    const responseJSON = await response.json();

    processResponses(responseJSON);

    if (responseJSON.data.after && responses.length < maxRequests) {
      fetchPosts(responseJSON.data.after);
      return;
    }

    addAllPostsToAllFolder();

    updateLocalStorageData();

    displayAll();

    stopSyncAnimation();
  } catch (error) {
    stopSyncAnimation();

    hideDefaultTextInFooter();

    displayLoginMessage();
  }
};

const startSyncAnimation = () => {
  document.querySelector("#btnSync").classList.add("spin");
};

const stopSyncAnimation = () => {
  document.querySelector("#btnSync").classList.remove("spin");
};

const generateURLStringForFetch = (afterParamForURL, postsPerRequest) => {
  const baseURL = "https://www.reddit.com/saved.json";
  const limitURLParam = `?limit=${postsPerRequest}$`;
  const afterURLParam = `${
    afterParamForURL ? "&after=" + afterParamForURL : ""
  }`;
  const wholeURL = `${baseURL}${limitURLParam}${afterURLParam}`;

  return wholeURL;
};

const processResponses = (responseJSON) => {
  responses.push(responseJSON);
  responseJSON.data.children.forEach(processPost);
};

const updateLocalStorageData = () => {
  const tempDate = new Date(Date.now());
  const lastSyncedDate = tempDate.toString().split(" GMT")[0];

  localStorage.setItem("lastSynced", lastSyncedDate);
  localStorage.setItem("folders", JSON.stringify(folders));
  localStorage.setItem("posts", JSON.stringify(posts));
};

const addAllPostsToAllFolder = () => {
  const allFolder = getAllFolder();
  posts.forEach((post) => allFolder.savedPosts.push(post));
};

const hideDefaultTextInFooter = () => {
  document.querySelector("#lblLastSynced").classList.add("hide");
  document.querySelector("#lastSyncedVal").classList.add("hide");
};

const displayLoginMessage = () => {
  const lblLogin = document.querySelector("#lblLogin");
  lblLogin.classList.remove("hide");
  lblLogin.innerHTML =
    "Unable to fetch posts while signed out. <a href='https://reddit.com/login' target='_blank'>Sign in.</a>";
  lblLogin.classList.add("show");
};

const processPost = (savedItem) => {
  if (
    folders.find(
      (folder) => folder.folderName === savedItem.data.subreddit_name_prefixed
    ) == null
  ) {
    const newFolder = {
      folderName: savedItem.data.subreddit_name_prefixed,
      savedPosts: [],
    };
    folders.push(newFolder);
  }

  const savedPost = {
    id: savedItem.data.name,
  };

  // post is a comment, so url won't work
  if (savedItem.data.name.substring(0, 3) === "t1_") {
    savedPost.link = "https://reddit.com" + savedItem.data.permalink;
    savedPost.title = savedItem.data.link_title;
  } else {
    savedPost.link = savedItem.data.url;
    savedPost.title = savedItem.data.title;
  }

  folders
    .find(
      (folder) => folder.folderName === savedItem.data.subreddit_name_prefixed
    )
    .savedPosts.push(savedPost);

  if (posts.find((post) => post.id === savedPost.id) == null) {
    const newPost = {
      id: savedPost.id,
      title: savedPost.title,
      link: savedPost.link,
    };
    posts.push(newPost);
  }
};

const displayAll = () => {
  const pageHigh = posts.length > 25 ? 25 : posts.length;
  const allFolder = getAllFolder();

  document.querySelector("#lastSyncedVal").innerHTML =
    localStorage.getItem("lastSynced");
  document.querySelector("#folders").innerHTML = "";

  folders.forEach(displayFolder);
  document.querySelector("#folders").scrollTop = 0;
  displayPostsFromFolder(allFolder, pageHigh);
};

const displayFolder = (folder) => {
  let totalPosts;
  if (folder && folder.savedPosts) {
    totalPosts = folder.savedPosts.length;
  }

  const pageHigh = totalPosts > 25 ? 25 : totalPosts;

  const btnFolder = document.createElement("div");
  btnFolder.className = "folder";
  btnFolder.id = folder.folderName;
  btnFolder.innerHTML = folder.folderName + "(" + totalPosts + ")";
  btnFolder.addEventListener("click", function () {
    configurePrevNextBtns(false, false);
    displayPostsFromFolder(folder, pageHigh);
  });
  document.querySelector("#folders").appendChild(btnFolder);
};

const displayPostsFromFolder = (folder, currentPageHigh) => {
  let totalPosts = 0;
  let currentPageLow = 0;
  let postsOnPage = [];
  const lblFolderName = document.querySelector("#lblFolderName");

  if (folder && folder.savedPosts) {
    totalPosts = folder.savedPosts.length;
  }

  if (totalPosts < 1) {
    currentPageLow = 0;
  } else {
    currentPageLow = totalPosts < 25 ? 1 : currentPageHigh - 24;
  }

  currentPageHigh =
    currentPageHigh <= totalPosts ? currentPageHigh : totalPosts;

  if (folder) {
    lblFolderName.innerHTML = folder.folderName;
  }

  if (folder && folder.savedPosts) {
    postsOnPage = folder.savedPosts.slice(currentPageLow - 1, currentPageHigh);
  }

  lblFolderName.className = "show";

  document.querySelector("#posts").innerHTML = "";

  document.querySelector("#lblPages").innerHTML =
    currentPageLow + "-" + currentPageHigh + " of " + totalPosts;
  postsOnPage.forEach(displayPost);
  document.querySelector("#posts").scrollTop = 0;

  document.querySelector("#btnPrevious").disabled =
    currentPageLow > 1 ? false : true;
  document.querySelector("#btnNext").disabled =
    currentPageHigh < totalPosts ? false : true;
  configurePrevNextBtns(
    document.querySelector("#btnPrevious").disabled,
    document.querySelector("#btnNext").disabled
  );

  if (
    document.querySelector("#btnPrevious").disabled == false &&
    !document.querySelector("#btnPrevious").getAttribute("hasEventHandler")
  )
    document
      .querySelector("#btnPrevious")
      .addEventListener(
        "click",
        btnPreviousOnClick.bind(
          null,
          folder,
          currentPageLow,
          currentPageHigh,
          totalPosts
        )
      );

  if (
    document.querySelector("#btnNext").disabled == false &&
    !document.querySelector("#btnNext").getAttribute("hasEventHandler")
  )
    document
      .querySelector("#btnNext")
      .addEventListener(
        "click",
        btnNextOnClick.bind(null, folder, currentPageHigh)
      );
};

const configurePrevNextBtns = (btnPrevDisabled, btnNextDisabled) => {
  let oldPrevDisabled = btnPrevDisabled;
  let oldNextDisabled = btnNextDisabled;

  const btnPrevious = document.querySelector("#btnPrevious");
  btnPrevious.disabled = false;

  const btnNext = document.querySelector("#btnNext");
  btnNext.disabled = false;

  if (btnPrevious.getAttribute("hasEventHandler"))
    removeEventHandler("btnPrevious");

  if (btnNext.getAttribute("hasEventHandler")) removeEventHandler("btnNext");

  document.querySelector("#btnPrevious").disabled = oldPrevDisabled;
  document.querySelector("#btnNext").disabled = oldNextDisabled;
};

const removeEventHandler = (btnID) => {
  // simplest way to remove the event listener given the nature of the callback functions' params
  const oldBtn = document.querySelector(`#${btnID}`);
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  document.querySelector(`#${btnID}`).removeAttribute("hasEventHandler");
};

const btnPreviousOnClick = (
  folder,
  currentPageLow,
  currentPageHigh,
  currentTotalPosts
) => {
  currentPageHigh =
    currentPageHigh === currentTotalPosts
      ? currentPageLow - 1
      : currentPageHigh - 25;
  document
    .querySelector("#btnPrevious")
    .setAttribute("hasEventHandler", "true");
  displayPostsFromFolder(folder, currentPageHigh);
};

const btnNextOnClick = (folder, currentPageHigh) => {
  currentPageHigh = currentPageHigh + 25;
  document.querySelector("#btnNext").setAttribute("hasEventHandler", "true");
  displayPostsFromFolder(folder, currentPageHigh);
};

const displayPost = (savedPost) => {
  const post = document.createElement("div");
  post.className = "post";
  post.id = savedPost.id;
  document.querySelector("#posts").appendChild(post);

  const link = document.createElement("a");
  link.href = savedPost.link;

  if (savedPost.id.substring(0, 3) === "t1_") {
    link.innerHTML = "(comment)";
  }

  link.innerHTML += savedPost.title;
  link.target = "_blank";

  document.querySelector(`#${post.id}`).appendChild(link);
  document.querySelector("#posts").innerHTML += "<hr>";
};

document.querySelector("#btnSync").addEventListener("click", handleSync);

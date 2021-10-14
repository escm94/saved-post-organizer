const postsPerRequest = 100;
const maxPostsToFetch = 1000;
const maxRequests = maxPostsToFetch / postsPerRequest;

let responses = [];
let folders = [];
let posts = [];

const handleSync = () => {
  folders = [];
  posts = [];
  responses = [];

  const allFolder = {
    folderName: "All",
    savedPosts: [],
    defaultFolder: true,
  };
  folders.push(allFolder);

  fetchPosts();
};

window.onload = () => {
  folders = [];
  posts = [];

  if (localStorage.getItem("folders") != null) {
    folders = JSON.parse(localStorage.getItem("folders"));
  }

  if (localStorage.getItem("posts") != null) {
    posts = JSON.parse(localStorage.getItem("posts"));
  }

  folders.forEach(displayFolder);

  const pageHigh = posts.length > 25 ? 25 : posts.length;

  configurePrevNextBtns(false, false);
  displayPostsFromFolder(
    folders.find((folder) => folder.folderName == "All"),
    pageHigh
  );
  document.getElementById("lastSyncedVal").innerHTML = localStorage.getItem(
    "lastSynced"
  );
};

const fetchPosts = async (afterParam) => {
  //TODO: obviously refine this
  try {
    document.getElementById("btnSync").classList.add("spin");

    const response = await fetch(
      `https://www.reddit.com/saved.json?limit=${postsPerRequest}${
        afterParam ? "&after=" + afterParam : ""
      }`
    );

    const responseJSON = await response.json();
    responses.push(responseJSON);
    responseJSON.data.children.forEach(processPost);

    if (responseJSON.data.after && responses.length < maxRequests) {
      fetchPosts(responseJSON.data.after);
      return;
    }

    let tempDate = new Date(Date.now());
    const lastSyncedDate = tempDate.toString().split(" GMT")[0];

    localStorage.setItem("lastSynced", lastSyncedDate);
    let allFolder = folders.find((folder) => folder.folderName == "All");
    posts.forEach((post) => allFolder.savedPosts.push(post));
    localStorage.setItem("folders", JSON.stringify(folders));
    localStorage.setItem("posts", JSON.stringify(posts));
    displayAll();

    document.getElementById("btnSync").classList.remove("spin");
  } catch (error) {
    document.getElementById("btnSync").classList.remove("spin");
    document.getElementById("lblLastSynced").classList.add("hide");
    document.getElementById("lastSyncedVal").classList.add("hide");

    const lblLogin = document.getElementById("lblLogin");
    lblLogin.classList.remove("hide");
    lblLogin.innerHTML =
      "<strong>Error: </strong>Unable to fetch posts while signed out. <a href='https://reddit.com/login' target='_blank'>Sign in.</a>";
    lblLogin.classList.add("show");
  }
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
      defaultFolder: true,
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

  document.getElementById("lastSyncedVal").innerHTML = localStorage.getItem(
    "lastSynced"
  );
  document.getElementById("folders").innerHTML = "";

  folders.forEach(displayFolder);
  document.getElementById("folders").scrollTop = 0;
  displayPostsFromFolder(
    folders.find((folder) => folder.folderName == "All"),
    pageHigh
  );
};

const displayFolder = (folder) => {
  const totalPosts = folder.savedPosts.length;
  const pageHigh = totalPosts > 25 ? 25 : totalPosts;

  const btnFolder = document.createElement("div");
  btnFolder.className = "folder";
  btnFolder.id = folder.folderName;
  btnFolder.innerHTML = folder.folderName + "(" + totalPosts + ")";
  btnFolder.addEventListener("click", function () {
    configurePrevNextBtns(false, false);
    displayPostsFromFolder(folder, pageHigh);
  });
  document.getElementById("folders").appendChild(btnFolder);
};

const displayPostsFromFolder = (folder, currentPageHigh) => {
  const totalPosts = folder.savedPosts.length;
  let currentPageLow;

  if (totalPosts < 1) {
    currentPageLow = 0;
  } else {
    currentPageLow = totalPosts < 25 ? 1 : currentPageHigh - 24;
  }

  currentPageHigh =
    currentPageHigh <= totalPosts ? currentPageHigh : totalPosts;

  const lblFolderName = document.getElementById("lblFolderName");
  lblFolderName.innerHTML = folder.folderName;
  lblFolderName.className = "show";

  document.getElementById("posts").innerHTML = "";
  const postsOnPage = folder.savedPosts.slice(
    currentPageLow - 1,
    currentPageHigh
  );
  document.getElementById("lblPages").innerHTML =
    currentPageLow + "-" + currentPageHigh + " of " + totalPosts;
  postsOnPage.forEach(displayPost);
  document.getElementById("posts").scrollTop = 0;

  document.getElementById("btnPrevious").disabled =
    currentPageLow > 1 ? false : true;
  document.getElementById("btnNext").disabled =
    currentPageHigh < totalPosts ? false : true;
  configurePrevNextBtns(
    document.getElementById("btnPrevious").disabled,
    document.getElementById("btnNext").disabled
  );

  if (
    document.getElementById("btnPrevious").disabled == false &&
    !document.getElementById("btnPrevious").getAttribute("hasEventHandler")
  )
    document
      .getElementById("btnPrevious")
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
    document.getElementById("btnNext").disabled == false &&
    !document.getElementById("btnNext").getAttribute("hasEventHandler")
  )
    document
      .getElementById("btnNext")
      .addEventListener(
        "click",
        btnNextOnClick.bind(null, folder, currentPageHigh)
      );
};

const configurePrevNextBtns = (btnPrevDisabled, btnNextDisabled) => {
  let oldPrevDisabled = btnPrevDisabled;
  let oldNextDisabled = btnNextDisabled;

  const btnPrevious = document.getElementById("btnPrevious");
  btnPrevious.disabled = false;

  const btnNext = document.getElementById("btnNext");
  btnNext.disabled = false;

  if (btnPrevious.getAttribute("hasEventHandler"))
    removeEventHandler("btnPrevious");

  if (btnNext.getAttribute("hasEventHandler")) removeEventHandler("btnNext");

  document.getElementById("btnPrevious").disabled = oldPrevDisabled;
  document.getElementById("btnNext").disabled = oldNextDisabled;
};

const removeEventHandler = (btnID) => {
  // simplest way to remove the event listener given the nature of the callback functions' params
  const oldBtn = document.getElementById(btnID);
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  document.getElementById(btnID).removeAttribute("hasEventHandler");
};

const btnPreviousOnClick = (
  folder,
  currentPageLow,
  currentPageHigh,
  currentTotalPosts
) => {
  currentPageHigh =
    currentPageHigh == currentTotalPosts
      ? currentPageLow - 1
      : currentPageHigh - 25;
  document
    .getElementById("btnPrevious")
    .setAttribute("hasEventHandler", "true");
  displayPostsFromFolder(folder, currentPageHigh);
};

const btnNextOnClick = (folder, currentPageHigh) => {
  currentPageHigh = currentPageHigh + 25;
  document.getElementById("btnNext").setAttribute("hasEventHandler", "true");
  displayPostsFromFolder(folder, currentPageHigh);
};

const displayPost = (savedPost) => {
  const post = document.createElement("div");
  post.className = "post";
  post.id = savedPost.id;
  document.getElementById("posts").appendChild(post);

  const link = document.createElement("a");
  link.href = savedPost.link;

  if (savedPost.id.substring(0, 3) === "t1_") {
    link.innerHTML = "(comment)";
  }

  link.innerHTML += savedPost.title;
  link.target = "_blank";

  document.getElementById(post.id).appendChild(link);
  document.getElementById("posts").innerHTML += "<hr>";
};

document.getElementById("btnSync").addEventListener("click", handleSync);

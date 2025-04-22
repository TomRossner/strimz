import Button from '../components/Button';
import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectSettings } from '../store/settings/settings.selectors';
import { DEFAULT_SETTINGS, fetchUserSettings, setSettings, Settings } from '../store/settings/settings.slice';
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import { MdOpenInNew } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import CheckForUpdatesButton from '@/components/CheckForUpdatesButton';
import BackButton from '@/components/BackButton';
import CloseButton from '@/components/CloseButton';
import PageDescription from '@/components/PageDescription';
import OptionDescription from '@/components/OptionDescription';

const SettingsPage = () => {
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectSettings);
    const [formValues, setFormValues] = useState<Settings>(DEFAULT_SETTINGS);

    const navigate = useNavigate();

    const handleSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();

        dispatch(setSettings(formValues));

        Object.entries(formValues).forEach(entry => {
            const [key, value] = entry;    
            window.electronAPI.saveSetting(key, value);
        });

        navigate(-1);
    }, [formValues, dispatch, navigate]);

    const handleDirectoryChange = async () => {
        try {
          const directoryPath = await window.electronAPI.openDirectoryDialog();

          if (directoryPath) {
            setFormValues(values => ({
                ...values,
                downloadsFolderPath: directoryPath,
            }));
          }
        } catch (err) {
          console.error("❌ React: failed to get directory", err);
        }
    }

    const handleAutoUpdateChange = (ev: ChangeEvent<HTMLInputElement>) => {
        window.electronAPI.updateAutoInstallSetting(ev.target.checked);
        
        setFormValues(formValues => ({
            ...formValues,
            updateOnQuit: ev.target.checked,
        }));
    }
    
    const handleClearOnExitChange = (ev: ChangeEvent<HTMLInputElement>) => {
        window.electronAPI.updateClearOnExitSetting(ev.target.checked);
        
        setFormValues(formValues => ({
            ...formValues,
            clearOnExit: ev.target.checked,
        }));
    }

    useEffect(() => {
        if (!formValues.downloadsFolderPath) {
            setFormValues(settings);
        }
    }, [settings, formValues]);

    useEffect(() => {
        dispatch(fetchUserSettings());
    }, [dispatch]);

  return (
    <Page>
        <Container id='settingsPage'>
            <PageTitle className='items-center'>
                <BackButton />
                <span className='grow -mt-1'>Settings</span>

                <CheckForUpdatesButton withText className='min-w-[200px] text-sm justify-center font-normal py-1 self-end' />
            </PageTitle>
            
            <PageDescription>Customize your preferences to get the best experience with the app.</PageDescription>
            
            <div className='relative flex flex-col w-full gap-3 grow'>
                <form className='text-white flex flex-col gap-5 h-full border border-stone-700 p-2' onSubmit={handleSubmit}>
                    <div className='flex w-full gap-2 flex-col'>
                        <p className='w-full flex justify-between'>
                            <span className='flex gap-2 items-center'>Download path</span>
                            
                            <Button onClick={handleDirectoryChange} className='text-blue-300 hover:text-blue-400 text-sm bg-stone-800'>
                                Choose download path
                            </Button>
                        </p>

                        <OptionDescription>Select the folder where downloaded content will be saved.</OptionDescription>

                        <div className='flex w-full gap-3 items-center'>
                            {formValues.downloadsFolderPath && (
                                <>
                                    <span title={formValues.downloadsFolderPath} className='text-sm py-1 grow rounded-sm font-light italic px-2 outline-none border-slate-400 max-w-full bg-stone-800 truncate' onClick={handleDirectoryChange}>
                                        {formValues.downloadsFolderPath}
                                    </span>
                            
                                    <Button
                                        title='Open folder'
                                        disabled={!formValues.downloadsFolderPath}
                                        onClick={() => window.electronAPI.openFolder(formValues.downloadsFolderPath)}
                                        className='p-1.5 text-stone-400 text-lg hover:bg-stone-600'
                                    >
                                        <MdOpenInNew />
                                    </Button>
                                </>
                            )}

                        </div>
                    </div>

                    <div className='flex w-full gap-2 flex-col'>
                        <div className='w-full flex gap-4 items-center'>
                            <span className='flex gap-2 items-center'>Clear downloads on exit</span>

                            <div className="relative inline-block w-11 h-5">
                                <input
                                    id="clearOnExit"
                                    type="checkbox"
                                    checked={formValues.clearOnExit}
                                    onChange={handleClearOnExitChange}
                                    className="peer appearance-none w-11 h-5 bg-gray-100 rounded-full checked:bg-green-600 cursor-pointer transition-colors duration-300"
                                />
                                <label
                                    htmlFor="clearOnExit"
                                    className="absolute top-0 left-0 w-5 h-5 bg-white rounded-full border border-slate-300 shadow-sm transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-green-600 cursor-pointer"
                                />
                            </div>
                        </div>

                        <OptionDescription>Clear downloads folder when exiting the app.</OptionDescription>
                    </div>

                    <div className='flex w-full gap-2 flex-col'>
                        <div className='w-full flex gap-4 items-center'>
                            <span className='flex gap-2 items-center'>Load on scroll</span>

                            <div className="relative inline-block w-11 h-5">
                                <input
                                    id="loadOnScroll"
                                    type="checkbox"
                                    checked={formValues.loadOnScroll}
                                    onChange={() => setFormValues(values => ({
                                        ...values,
                                        loadOnScroll: !values.loadOnScroll
                                    }))}
                                    className="peer appearance-none w-11 h-5 bg-gray-100 rounded-full checked:bg-green-600 cursor-pointer transition-colors duration-300"
                                />
                                <label
                                    htmlFor="loadOnScroll"
                                    className="absolute top-0 left-0 w-5 h-5 bg-white rounded-full border border-slate-300 shadow-sm transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-green-600 cursor-pointer"
                                />
                            </div>
                        </div>

                        <OptionDescription>Automatically load more movies as you scroll down.</OptionDescription>
                    </div>
                    
                    <div className='flex w-full gap-2 flex-col'>
                        <div className='w-full flex gap-4 items-center'>
                            <span className='flex gap-2 items-center'>Auto-update on quit</span>

                            <div className="relative inline-block w-11 h-5">
                                <input
                                    id="updateOnQuit"
                                    type="checkbox"
                                    checked={formValues.updateOnQuit}
                                    onChange={handleAutoUpdateChange}
                                    className="peer appearance-none w-11 h-5 bg-gray-100 rounded-full checked:bg-green-600 cursor-pointer transition-colors duration-300"
                                />
                                <label
                                    htmlFor="updateOnQuit"
                                    className="absolute top-0 left-0 w-5 h-5 bg-white rounded-full border border-slate-300 shadow-sm transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-green-600 cursor-pointer"
                                />
                            </div>
                        </div>

                        <OptionDescription>Automatically install new updates when quitting the app.</OptionDescription>
                    </div>

                    <div className='grow' />

                    <div className="p-4 w-full bg-stone-800 flex gap-2 items-center justify-center flex-wrap md:flex-nowrap">
                        <Button
                            type='submit'
                            disabled={!formValues.downloadsFolderPath}
                            className='text-white w-full bg-slate-600 hover:bg-slate-500'
                        >
                            Save changes
                        </Button>
                        <CloseButton
                            text='Cancel'
                            onClose={() => navigate(-1)}
                            className='relative md:block text-stone-300 w-full text-base py-1 top-0 border-none hover:bg-stone-600 right-0'
                        >
                            Cancel
                        </CloseButton>
                    </div>
                </form>
            </div>
        </Container>
    </Page>
  )
}

export default SettingsPage;